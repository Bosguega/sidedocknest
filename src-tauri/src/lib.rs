mod commands;
mod tray;

use tauri::{Manager, PhysicalPosition, PhysicalSize, Position, Size};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // ===== SIDEDOCKNEST STARTUP SIZE + POSITION =====
            let window = app.get_webview_window("main").unwrap();

            // Load initial side preference directly from store file
            let app_handle = app.handle();
            let mut side = "left".to_string();
            if let Some(config_dir) = app_handle.path().app_config_dir().ok() {
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

            if let Some(monitor) = window.current_monitor().unwrap() {
                let work_area = monitor.work_area();
                let scale = window.scale_factor().unwrap_or(1.0);
                
                // Start collapsed by default
                let logical_width = 22.0;
                let physical_width = (logical_width * scale).round() as u32;

                window.set_size(Size::Physical(PhysicalSize {
                    width: physical_width,
                    height: work_area.size.height,
                }))?;

                let x = if side == "left" {
                    work_area.position.x
                } else {
                    work_area.position.x + work_area.size.width as i32 - physical_width as i32
                };

                window.set_position(Position::Physical(PhysicalPosition {
                    x,
                    y: work_area.position.y,
                }))?;
            }
            // ===== END STARTUP CONTROL =====

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
            commands::get_active_monitor_info,
            commands::update_window_bounds,
            commands::path_exists,
            commands::list_start_menu_items,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
