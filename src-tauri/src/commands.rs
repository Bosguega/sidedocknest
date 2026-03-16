use std::process::Command;

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

/// Returns the primary monitor's screen dimensions.
#[tauri::command]
pub fn get_screen_size(window: tauri::WebviewWindow) -> Result<(u32, u32), String> {
    let monitor = window
        .current_monitor()
        .map_err(|e| format!("Failed to get current monitor: {:?}", e))?
        .ok_or_else(|| "No monitor found".to_string())?;

    let size = monitor.size();
    Ok((size.width, size.height))
}

/// Checks if a file path exists on the filesystem.
#[tauri::command]
pub fn path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}
