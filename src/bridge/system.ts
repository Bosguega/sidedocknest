import { listen } from "@tauri-apps/api/event";

export const systemBridge = {

  onTrayToggleSide: (handler: () => void) =>
    listen("tray-toggle-side", handler),

  onTrayToggleTheme: (handler: () => void) =>
    listen("tray-toggle-theme", handler),

  onTrayToggleAutostart: (handler: () => void) =>
    listen("tray-toggle-autostart", handler),

  onDragDrop: <T>(handler: (event: { payload: T }) => void) =>
    listen<T>("tauri://drag-drop", handler)
};
