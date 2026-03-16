export type DockItemType = "app" | "file" | "folder";

export type DockItem = {
  id: string;
  name: string;
  path: string;
  type: DockItemType;
  icon?: string; // base64 PNG
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
