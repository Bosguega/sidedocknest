mod commands;
mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // ── icon:// custom protocol ───────────────────────────────────────────
        // Serves cached PNG icons from {app_cache_dir}/icons/{hash}.png.
        // The frontend requests  icon://localhost/{hash}.png  (macOS/Linux) or
        // http://icon.localhost/{hash}.png  (Windows — wry remaps automatically).
        // convertFileSrc(filename, "icon") handles the platform URL difference.
        .register_uri_scheme_protocol("icon", |ctx, request| {
            // Strip the leading "/" from the URI path to get the plain filename.
            let filename = request.uri().path().trim_start_matches('/').to_string();

            let icon_bytes: Option<Vec<u8>> = ctx
                .app_handle()
                .path()
                .app_cache_dir()
                .ok()
                .map(|d| d.join("icons").join(&filename))
                .and_then(|p| std::fs::read(&p).ok());

            match icon_bytes {
                Some(bytes) => tauri::http::Response::builder()
                    .header("Content-Type", "image/png")
                    // Icons are content-addressed (path hash) — safe to cache forever.
                    .header("Cache-Control", "public, max-age=31536000, immutable")
                    .body(bytes)
                    .unwrap(),
                None => tauri::http::Response::builder()
                    .status(tauri::http::StatusCode::NOT_FOUND)
                    .body(Vec::<u8>::new())
                    .unwrap(),
            }
        })
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .expect("Main window 'main' must be defined in tauri.conf.json");

            // Read the persisted side preference directly from the config file
            // so the window is positioned correctly before the frontend loads.
            // NOTE: the key "side" must stay in sync with configStore.ts.
            let app_handle = app.handle();
            let mut side = "left".to_string();
            if let Ok(config_dir) = app_handle.path().app_config_dir() {
                let config_file = config_dir.join("config.json");
                if config_file.exists() {
                    if let Ok(content) = std::fs::read_to_string(config_file) {
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                            if let Some(s) = json.get("side").and_then(|v| v.as_str()) {
                                side = s.to_string();
                            }
                        }
                    }
                }
            }

            // Reuse the existing Rust command to position the window at startup
            // (collapsed by default) instead of duplicating the sizing logic here.
            if let Err(e) = commands::update_window_bounds(window.clone(), false, side) {
                eprintln!("Failed to set initial window bounds: {}", e);
            }

            // Register the log plugin only in debug builds.
            // Using the attribute form ensures the crate is excluded from the
            // release binary rather than just being skipped at runtime.
            #[cfg(debug_assertions)]
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            tray::create_tray(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_file,
            commands::open_file_location,
            commands::extract_icon,
            commands::resolve_shortcut,
            commands::update_window_bounds,
            commands::path_exists,
            commands::list_start_menu_items,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
