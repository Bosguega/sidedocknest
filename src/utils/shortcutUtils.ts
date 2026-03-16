import { commands } from "../bridge/commands";
import type { DockItemType } from "../types/dock";

/** Normaliza separadores de caminho para backslash (Windows). */
function normalizePath(path: string): string {
  return path.replace(/\//g, "\\");
}

export function getItemType(path: string): DockItemType {
  const normalized = normalizePath(path);
  const lower = normalized.toLowerCase();
  if (lower.endsWith(".exe") || lower.endsWith(".lnk")) return "app";
  const parts = normalized.split("\\");
  const last = parts[parts.length - 1];
  if (!last.includes(".")) return "folder";
  return "file";
}

export function getItemName(path: string): string {
  const parts = normalizePath(path).split("\\");
  const filename = parts[parts.length - 1];
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex > 0) {
    return filename.substring(0, dotIndex);
  }
  return filename;
}

export async function processFile(rawPath: string): Promise<{
  name: string;
  path: string;
  type: DockItemType;
  icon?: string;
}> {
  let path = rawPath;
  let itemType = getItemType(path);

  // Resolve .lnk shortcuts
  if (path.toLowerCase().endsWith(".lnk")) {
    try {
      const resolved = await commands.resolveShortcut(path) as string;
      path = resolved;
      itemType = getItemType(path);
    } catch (e) {
      console.warn("Could not resolve shortcut:", e);
    }
  }

  // Extract icon
  let icon: string | undefined;
  try {
    icon = await commands.extractIcon(rawPath) as string;
  } catch (e) {
    // If rawPath failed (maybe it's a link to a non-existent file), try resolved path
    try {
      icon = await commands.extractIcon(path) as string;
    } catch (e2) {
      console.warn("Could not extract icon for both paths:", e2);
    }
  }

  return {
    name: getItemName(rawPath),
    path: rawPath, // We keep the original path for the item so it stays valid as a shortcut if it was one
    type: itemType,
    icon,
  };
}
