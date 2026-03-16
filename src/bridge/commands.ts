import { invoke } from "@tauri-apps/api/core";

export const commands = {
  openFile: (path: string) => invoke("open_file", { path }),

  openFileLocation: (path: string) => invoke("open_file_location", { path }),

  extractIcon: (path: string) => invoke("extract_icon", { path }),

  resolveShortcut: (path: string) => invoke("resolve_shortcut", { path }),

  updateWindowBounds: (isExpanded: boolean, side: string) =>
    invoke("update_window_bounds", { isExpanded, side }),

  pathExists: (path: string) => invoke("path_exists", { path }),

  listStartMenuItems: () => invoke("list_start_menu_items"),
};
