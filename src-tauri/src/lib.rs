mod commands;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Create system tray
            tray::create_tray(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_file,
            commands::open_file_location,
            commands::extract_icon,
            commands::resolve_shortcut,
            commands::get_screen_size,
            commands::path_exists,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
