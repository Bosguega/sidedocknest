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
      const resolved = (await commands.resolveShortcut(path)) as string;
      path = resolved;
      itemType = getItemType(path);
    } catch (e) {
      console.warn("Could not resolve shortcut:", e);
    }
  }

  // Extract icon — try rawPath first, fall back to resolved path
  let icon: string | undefined;
  try {
    icon = (await commands.extractIcon(rawPath)) as string;
  } catch {
    try {
      icon = (await commands.extractIcon(path)) as string;
    } catch (e) {
      console.warn("Could not extract icon for both paths:", e);
    }
  }

  return {
    name: getItemName(rawPath),
    path: rawPath,
    type: itemType,
    icon,
  };
}
