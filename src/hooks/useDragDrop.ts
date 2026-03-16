import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useDockStore } from "../stores/dockStore";
import { useToastStore } from "../stores/toastStore";
import type { DockItemType } from "../types/dock";

type DragDropPayload = {
  paths: string[];
  position: { x: number; y: number };
};

function getItemType(path: string): DockItemType {
  const lower = path.toLowerCase();
  if (lower.endsWith(".exe") || lower.endsWith(".lnk")) return "app";
  // Check if it looks like a directory (no extension at the end)
  const parts = path.split("\\");
  const last = parts[parts.length - 1];
  if (!last.includes(".")) return "folder";
  return "file";
}

function getItemName(path: string): string {
  const parts = path.replace(/\//g, "\\").split("\\");
  const filename = parts[parts.length - 1];
  // Remove extension for display
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex > 0) {
    return filename.substring(0, dotIndex);
  }
  return filename;
}

export function useDragDrop() {
  const { addStack, addItem } = useDockStore();
  const addToast = useToastStore((s) => s.addToast);
  const isSettingUp = useRef(false);

  useEffect(() => {
    // Avoid multiple setups if the component re-renders or in Strict Mode
    if (isSettingUp.current) return;
    isSettingUp.current = true;

    let unlistenPromise: Promise<() => void>;

    const setup = async () => {
      unlistenPromise = listen<DragDropPayload>(
        "tauri://drag-drop",
        async (event) => {
          const paths = event.payload.paths;
          if (!paths || paths.length === 0) return;

          // Find first stack or create a default one
          // We use getState() inside the callback to always have the latest state
          let targetStackId: string | undefined;
          const currentStacks = useDockStore.getState().stacks;

          if (currentStacks.length === 0) {
            // Create a default stack
            addStack("General");
            // Wait a tick for state to update
            await new Promise((r) => setTimeout(r, 100));
            const updatedStacks = useDockStore.getState().stacks;
            targetStackId = updatedStacks[updatedStacks.length - 1]?.id;
          } else {
            targetStackId = currentStacks[0].id;
          }

          if (!targetStackId) return;

          for (const rawPath of paths) {
            let path = rawPath;
            let itemType = getItemType(path);

            // Resolve .lnk shortcuts
            if (path.toLowerCase().endsWith(".lnk")) {
              try {
                const resolved = await invoke<string>("resolve_shortcut", {
                  path,
                });
                path = resolved;
                itemType = getItemType(path);
              } catch (e) {
                console.warn("Could not resolve shortcut, using .lnk path:", e);
              }
            }

            // Try to extract icon
            let icon: string | undefined;
            try {
              icon = await invoke<string>("extract_icon", { path });
            } catch (e) {
              console.warn("Could not extract icon:", e);
            }

            const itemName = getItemName(rawPath);
            addItem(targetStackId, {
              name: itemName,
              path,
              type: itemType,
              icon,
            });

            addToast(`Added ${itemName}`, "success");
          }
        }
      );
    };

    setup();

    return () => {
      // Correctly handle async unlisten cleanup
      unlistenPromise?.then(fn => fn());
      isSettingUp.current = false;
    };
  }, [addStack, addItem, addToast]);
}
