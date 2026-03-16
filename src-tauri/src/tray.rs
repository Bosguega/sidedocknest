use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    App, Emitter,
};

pub fn create_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let toggle_side = MenuItem::with_id(app, "toggle_side", "Switch Side (Left/Right)", true, None::<&str>)?;
    let toggle_theme = MenuItem::with_id(app, "toggle_theme", "Switch Theme (Dark/Light)", true, None::<&str>)?;
    let toggle_autostart = MenuItem::with_id(app, "toggle_autostart", "Toggle Auto-start", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit SideDockNest", true, None::<&str>)?;

    let separator = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(app, &[
        &toggle_side,
        &toggle_theme,
        &toggle_autostart,
        &separator,
        &quit,
    ])?;

    // Use expect() instead of unwrap() to give a meaningful panic message
    // if the icon is missing from tauri.conf.json
    let icon = app
        .default_window_icon()
        .expect("Default window icon not configured in tauri.conf.json")
        .clone();

    TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        // Left-click toggles the dock expand state via a frontend event
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                button_state: tauri::tray::MouseButtonState::Up,
                ..
            } = event
            {
                let _ = tray.app_handle().emit("tray-toggle-expand", ());
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "toggle_side" => {
                let _ = app.emit("tray-toggle-side", ());
            }
            "toggle_theme" => {
                let _ = app.emit("tray-toggle-theme", ());
            }
            "toggle_autostart" => {
                let _ = app.emit("tray-toggle-autostart", ());
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
