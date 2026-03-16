import { useEffect, useRef } from "react";
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
  const addToast = useToastStore((s: any) => s.addToast);
  const isSettingUp = useRef(false);

  useEffect(() => {
    if (isSettingUp.current) return;
    isSettingUp.current = true;

    let unlisten: (() => void) | null = null;

    const setup = async () => {
      unlisten = await systemBridge.onDragDrop<DragDropPayload>(
        async (event) => {
          const paths = event.payload.paths;
          if (!paths || paths.length === 0) return;

          let targetStackId: string | undefined;
          const currentStacks = useDockStore.getState().stacks;

          if (currentStacks.length === 0) {
            addStack("General");
            targetStackId = useDockStore.getState().stacks.at(-1)?.id;
          } else {
            targetStackId = currentStacks[0].id;
          }

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
        },
      );
    };

    setup();

    return () => {
      if (unlisten) unlisten();
      isSettingUp.current = false;
    };
  }, [addStack, addItem, addToast]);
}
