import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { useDockStore } from "../stores/dockStore";
import { useToastStore } from "../stores/toastStore";
import { processFile } from "../utils/shortcutUtils";

type DragDropPayload = {
  paths: string[];
  position: { x: number; y: number };
};

export function useDragDrop() {
  const { addStack, addItem } = useDockStore();
  const addToast = useToastStore((s) => s.addToast);
  const isSettingUp = useRef(false);

  useEffect(() => {
    if (isSettingUp.current) return;
    isSettingUp.current = true;

    let unlistenPromise: Promise<() => void>;

    const setup = async () => {
      unlistenPromise = listen<DragDropPayload>(
        "tauri://drag-drop",
        async (event) => {
          const paths = event.payload.paths;
          if (!paths || paths.length === 0) return;

          let targetStackId: string | undefined;
          const currentStacks = useDockStore.getState().stacks;

          if (currentStacks.length === 0) {
            addStack("General");
            await new Promise((r) => setTimeout(r, 100));
            const updatedStacks = useDockStore.getState().stacks;
            targetStackId = updatedStacks[updatedStacks.length - 1]?.id;
          } else {
            targetStackId = currentStacks[0].id;
          }

          if (!targetStackId) return;

          for (const rawPath of paths) {
            try {
              const processed = await processFile(rawPath);
              addItem(targetStackId, processed);
              addToast(`Added ${processed.name}`, "success");
            } catch (e) {
              console.error("Failed to process dropped file:", e);
              addToast("Failed to add item", "error");
            }
          }
        }
      );
    };

    setup();

    return () => {
      unlistenPromise?.then(fn => fn());
      isSettingUp.current = false;
    };
  }, [addStack, addItem, addToast]);
}
