import { useEffect } from "react";
import { useDockStore } from "../stores/dockStore";
import { useToastStore } from "../stores/toastStore";
import { processFile } from "../utils/shortcutUtils";
import { systemBridge } from "../bridge/system";

type DragDropPayload = {
  paths: string[];
  position: { x: number; y: number };
};

export function useDragDrop() {
  const { addStack, addItem } = useDockStore();
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let active = true;

    systemBridge
      .onDragDrop<DragDropPayload>(async (event) => {
        const paths = event.payload.paths;
        if (!paths || paths.length === 0) return;

        const currentStacks = useDockStore.getState().stacks;

        // addStack now returns the new id directly — no fragile .at(-1) read
        const targetStackId =
          currentStacks.length === 0
            ? addStack("General")
            : currentStacks[0].id;

        if (!targetStackId) return;

        for (const rawPath of paths) {
          try {
            const processed = await processFile(rawPath);
            const added = addItem(targetStackId, processed);
            if (added) {
              addToast(`Added ${processed.name}`, "success");
            } else {
              addToast(
                `"${processed.name}" is already in this stack`,
                "warning",
              );
            }
          } catch (e) {
            console.error("Failed to process dropped file:", e);
            addToast("Failed to add item", "error");
          }
        }
      })
      .then((fn) => {
        if (active) {
          // Component is still mounted — store the unlisten handle
          cleanup = fn;
        } else {
          // Component already unmounted before the Promise resolved — clean up immediately
          fn();
        }
      });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [addStack, addItem, addToast]);
}
