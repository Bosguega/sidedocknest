import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { commands } from "../bridge/commands";
import { useConfigStore } from "../stores/configStore";

export function useWindowPosition(isExpanded: boolean) {
  const { side } = useConfigStore();
  const isResizing = useRef(false);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const updatePosition = async () => {
      if (isResizing.current) return;
      isResizing.current = true;

      try {
        await commands.updateWindowBounds(isExpanded, side);
      } catch (e) {
        console.error("Failed to update window bounds via Rust:", e);
      } finally {
        if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = setTimeout(() => {
          isResizing.current = false;
        }, 100);
      }
    };

    updatePosition();

    const unlistenPromise = getCurrentWindow().onResized(() => {
      if (!isResizing.current) updatePosition();
    });

    return () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [side, isExpanded]);
}
