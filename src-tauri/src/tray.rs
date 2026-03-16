use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    App, Emitter,
};

pub fn create_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let toggle_side = MenuItem::with_id(app, "toggle_side", "Switch Side (Left/Right)", true, None::<&str>)?;
    let toggle_theme = MenuItem::with_id(app, "toggle_theme", "Switch Theme (Dark/Light)", true, None::<&str>)?;
    let toggle_autostart = MenuItem::with_id(app, "toggle_autostart", "Toggle Auto-start", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit SideDockNest", true, None::<&str>)?;
    
    let menu = Menu::with_items(app, &[
        &toggle_side,
        &toggle_theme,
        &toggle_autostart,
        &MenuItem::with_id(app, "sep", "---", false, None::<&str>)?, // Separator
        &quit
    ])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
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
