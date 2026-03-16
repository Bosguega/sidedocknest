use std::process::Command;
use tauri::{PhysicalPosition, PhysicalSize, Position, Size};

#[cfg(windows)]
// use base64::Engine; // Removed unused

/// Opens a file, folder, or application using the system's default handler.
#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    if !std::path::Path::new(&path).exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    open::that(&path).map_err(|e| format!("Failed to open '{}': {}", path, e))
}

/// Opens Windows Explorer with the file's parent folder selected.
#[tauri::command]
pub fn open_file_location(path: String) -> Result<(), String> {
    let path_obj = std::path::Path::new(&path);
    if !path_obj.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    Command::new("explorer.exe")
        .arg("/select,")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open file location: {}", e))?;

    Ok(())
}

/// Extracts the icon from a file and returns it as a base64-encoded PNG string.
#[cfg(windows)]
#[tauri::command]
pub fn extract_icon(path: String) -> Result<String, String> {
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine;

    let path_obj = std::path::Path::new(&path);
    if !path_obj.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    // Try to extract icon using windows-icons
    match windows_icons::get_icon_base64_by_path(&path) {
        Ok(base64_icon) => Ok(base64_icon),
        Err(e) => Err(format!("Failed to extract icon from '{}': {:?}", path, e)),
    }
}

/// Fallback for non-Windows platforms
#[cfg(not(windows))]
#[tauri::command]
pub fn extract_icon(_path: String) -> Result<String, String> {
    Err("Icon extraction is only supported on Windows".to_string())
}

/// Resolves a .lnk shortcut file to its target path.
#[cfg(windows)]
#[tauri::command]
pub fn resolve_shortcut(path: String) -> Result<String, String> {
    let shortcut = lnk::ShellLink::open(&path)
        .map_err(|e| format!("Failed to read shortcut '{}': {:?}", path, e))?;

    // Try to get the target path from link_info
    if let Some(link_info) = shortcut.link_info() {
        if let Some(local_path) = link_info.local_base_path() {
            return Ok(local_path.to_string());
        }
    }

    // Fallback: try relative_path
    if let Some(rel_path) = shortcut.relative_path() {
        return Ok(rel_path.to_string());
    }

    Err(format!("Could not resolve shortcut target for '{}'", path))
}

/// Fallback for non-Windows platforms
#[cfg(not(windows))]
#[tauri::command]
pub fn resolve_shortcut(_path: String) -> Result<String, String> {
    Err("Shortcut resolution is only supported on Windows".to_string())
}

#[derive(serde::Serialize)]
pub struct MonitorInfo {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub work_x: i32,
    pub work_y: i32,
    pub work_width: u32,
    pub work_height: u32,
}

/// Returns the information of the monitor the window is currently on.
#[tauri::command]
pub fn get_active_monitor_info(window: tauri::WebviewWindow) -> Result<MonitorInfo, String> {
    let monitor = window
        .current_monitor()
        .map_err(|e| format!("Failed to get current monitor: {:?}", e))?
        .ok_or_else(|| "No monitor found".to_string())?;

    let size = monitor.size();
    let pos = monitor.position();
    let work_area = monitor.work_area(); // Rect { position, size }
    
    Ok(MonitorInfo {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
        work_x: work_area.position.x,
        work_y: work_area.position.y,
        work_width: work_area.size.width,
        work_height: work_area.size.height,
    })
}

#[tauri::command]
pub fn update_window_bounds(
    window: tauri::WebviewWindow,
    is_expanded: bool,
    side: String,
) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .map_err(|e| format!("Failed to get current monitor: {:?}", e))?
        .ok_or_else(|| "No monitor found".to_string())?;

    let work_area = monitor.work_area();
    let scale = window
        .scale_factor()
        .map_err(|e| format!("Failed to get scale factor: {:?}", e))?;

    let logical_width = if is_expanded { 220.0 } else { 22.0 };
    let physical_width = (logical_width * scale).round() as u32;

    // Set size first (important for positioning calculation)
    window
        .set_size(Size::Physical(PhysicalSize {
            width: physical_width,
            height: work_area.size.height,
        }))
        .map_err(|e| format!("Failed to set window size: {:?}", e))?;

    let x = if side == "left" {
        work_area.position.x
    } else {
        work_area.position.x + work_area.size.width as i32 - physical_width as i32
    };

    window
        .set_position(Position::Physical(PhysicalPosition {
            x,
            y: work_area.position.y,
        }))
        .map_err(|e| format!("Failed to set window position: {:?}", e))?;

    Ok(())
}

/// Checks if a file path exists on the filesystem.
#[tauri::command]
pub fn path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[derive(serde::Serialize)]
pub struct StartMenuItem {
    pub name: String,
    pub path: String,
}

#[tauri::command]
pub fn list_start_menu_items() -> Vec<StartMenuItem> {
    use std::env;
    use walkdir::WalkDir;

    let mut items = Vec::new();
    let mut paths = Vec::new();

    // System-wide start menu
    paths.push("C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs".to_string());
    
    // User-specific start menu
    if let Ok(appdata) = env::var("APPDATA") {
        paths.push(format!("{}\\Microsoft\\Windows\\Start Menu\\Programs", appdata));
    }

    for base_path in paths {
        for entry in WalkDir::new(base_path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| {
                let p = e.path();
                p.is_file() && (p.extension().map_or(false, |ext| ext == "lnk" || ext == "exe"))
            })
        {
            let path = entry.path();
            let name = path.file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| "Unknown".to_string());
            
            items.push(StartMenuItem {
                name,
                path: path.to_string_lossy().to_string(),
            });
        }
    }

    // Sort by name for better UX
    items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    items
}
