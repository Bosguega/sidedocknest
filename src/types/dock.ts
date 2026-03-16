export type DockItemType = "app" | "file" | "folder";

export type DockItem = {
  id: string;
  name: string;
  path: string;
  type: DockItemType;
  /**
   * Cache filename for the item's icon, e.g. `"a3f1b2c4d5e6f708.png"`.
   *
   * The file lives at `{app_cache_dir}/icons/{icon}` and is served by the
   * custom `icon://` protocol registered in `lib.rs`.
   *
   * In the frontend, convert to a loadable URL with:
   *   `convertFileSrc(item.icon, "icon")` from `@tauri-apps/api/core`
   *
   * Legacy base64 blobs are stripped on load and re-extracted by
   * `refreshIcons()` into the persistent disk cache automatically.
   */
  icon?: string;
  createdAt: number;
  isValid?: boolean;
};

export type DockStack = {
  id: string;
  name: string;
  items: DockItem[];
  isExpanded: boolean;
  createdAt: number;
};

export type DockSide = "left" | "right";
export type AppTheme = "dark" | "light";

export type AppConfig = {
  side: DockSide;
  theme: AppTheme;
  autoStart: boolean;
};
