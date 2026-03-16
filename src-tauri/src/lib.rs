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
            // ===== SIDEDOCKNEST WINDOW SIZE + POSITION CONTROL =====
            let window = app.get_webview_window("main").unwrap();

            if let Some(monitor) = window.current_monitor().unwrap() {
                let work_area = monitor.work_area();

                let sidebar_width = 220;
                let sidebar_height = work_area.size.height;

                window.set_size(Size::Physical(PhysicalSize {
                    width: sidebar_width,
                    height: sidebar_height,
                }))?;

                window.set_position(Position::Physical(PhysicalPosition {
                    x: work_area.position.x,
                    y: work_area.position.y,
                }))?;
            }
            // ===== END SIDEDOCKNEST WINDOW CONTROL =====
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
            commands::path_exists,
            commands::list_start_menu_items,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
