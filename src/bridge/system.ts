import { listen } from "@tauri-apps/api/event";

export const systemBridge = {
  onTrayToggleSide: (handler: () => void) =>
    listen("tray-toggle-side", handler),

  onTrayToggleTheme: (handler: () => void) =>
    listen("tray-toggle-theme", handler),

  onTrayToggleAutostart: (handler: () => void) =>
    listen("tray-toggle-autostart", handler),

  // Emitted by the tray icon on left-click — toggles the dock expand state.
  onTrayToggleExpand: (handler: () => void) =>
    listen("tray-toggle-expand", handler),

  onDragDrop: <T>(handler: (event: { payload: T }) => void) =>
    listen<T>("tauri://drag-drop", handler),
};
