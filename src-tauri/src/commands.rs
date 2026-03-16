use std::process::Command;
use tauri::{Manager, PhysicalPosition, PhysicalSize, Position, Size};

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

/// FNV-1a 64-bit hash — deterministic across runs (unlike DefaultHasher which
/// uses a random seed). Used to derive stable cache filenames from file paths.
#[cfg(windows)]
fn fnv1a_hash(data: &str) -> u64 {
    const FNV_OFFSET: u64 = 14695981039346656037;
    const FNV_PRIME: u64 = 1099511628211;
    let mut hash = FNV_OFFSET;
    for byte in data.bytes() {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(FNV_PRIME);
    }
    hash
}

/// Extracts the icon for a file and caches it as a PNG on disk.
///
/// Returns the cache filename (e.g. `"a3f1b2c4d5e6f708.png"`) — NOT base64.
/// The frontend resolves this to a URL via `convertFileSrc(filename, "icon")`.
///
/// Cache location: `{app_cache_dir}/icons/{hash}.png`
/// On a cache hit the file is served immediately without calling windows-icons.
#[cfg(windows)]
#[tauri::command]
pub fn extract_icon(app: tauri::AppHandle, path: String) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};

    // Normalise to lowercase so that paths differing only in case share one
    // cache entry (Windows paths are case-insensitive).
    let hash = fnv1a_hash(&path.to_lowercase());
    let filename = format!("{:016x}.png", hash);

    let icons_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Failed to resolve cache dir: {:?}", e))?
        .join("icons");

    let icon_path = icons_dir.join(&filename);

    // ── Cache hit ────────────────────────────────────────────────────────────
    if icon_path.exists() {
        return Ok(filename);
    }

    // ── Validate source path ─────────────────────────────────────────────────
    if !std::path::Path::new(&path).exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    // ── Create cache directory if needed ─────────────────────────────────────
    std::fs::create_dir_all(&icons_dir)
        .map_err(|e| format!("Failed to create icons cache dir: {:?}", e))?;

    // ── Extract icon (windows-icons returns base64-encoded PNG) ───────────────
    let b64 = windows_icons::get_icon_base64_by_path(&path)
        .map_err(|e| format!("Failed to extract icon for '{}': {:?}", path, e))?;

    // ── Decode base64 → raw PNG bytes ─────────────────────────────────────────
    let png_bytes = STANDARD
        .decode(&b64)
        .map_err(|e| format!("Failed to decode icon data for '{}': {:?}", path, e))?;

    // ── Write PNG to cache ────────────────────────────────────────────────────
    std::fs::write(&icon_path, &png_bytes)
        .map_err(|e| format!("Failed to write icon cache for '{}': {:?}", path, e))?;

    Ok(filename)
}

/// Fallback stub for non-Windows platforms.
#[cfg(not(windows))]
#[tauri::command]
pub fn extract_icon(_app: tauri::AppHandle, _path: String) -> Result<String, String> {
    Err("Icon extraction is only supported on Windows".to_string())
}

/// Resolves a .lnk shortcut file to its target path.
#[cfg(windows)]
#[tauri::command]
pub fn resolve_shortcut(path: String) -> Result<String, String> {
    let shortcut = lnk::ShellLink::open(&path)
        .map_err(|e| format!("Failed to read shortcut '{}': {:?}", path, e))?;

    if let Some(link_info) = shortcut.link_info() {
        if let Some(local_path) = link_info.local_base_path() {
            return Ok(local_path.to_string());
        }
    }

    if let Some(rel_path) = shortcut.relative_path() {
        return Ok(rel_path.to_string());
    }

    Err(format!("Could not resolve shortcut target for '{}'", path))
}

/// Fallback stub for non-Windows platforms.
#[cfg(not(windows))]
#[tauri::command]
pub fn resolve_shortcut(_path: String) -> Result<String, String> {
    Err("Shortcut resolution is only supported on Windows".to_string())
}

/// Calculates and applies the correct size and position for the dock window.
/// Called both on startup (collapsed) and whenever the side or expand state changes.
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

/// Lists all .lnk and .exe entries from the system and user Start Menu folders.
#[tauri::command]
pub fn list_start_menu_items() -> Vec<StartMenuItem> {
    use std::env;
    use walkdir::WalkDir;

    let mut items = Vec::new();
    let mut paths = Vec::new();

    paths.push("C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs".to_string());

    if let Ok(appdata) = env::var("APPDATA") {
        paths.push(format!(
            "{}\\Microsoft\\Windows\\Start Menu\\Programs",
            appdata
        ));
    }

    for base_path in paths {
        for entry in WalkDir::new(base_path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| {
                let p = e.path();
                p.is_file()
                    && p.extension()
                        .map_or(false, |ext| ext == "lnk" || ext == "exe")
            })
        {
            let path = entry.path();
            let name = path
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| "Unknown".to_string());

            items.push(StartMenuItem {
                name,
                path: path.to_string_lossy().to_string(),
            });
        }
    }

    items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    items
}
