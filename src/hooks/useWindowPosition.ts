import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useConfigStore } from "../stores/configStore";

export function useWindowPosition(isExpanded: boolean) {
  const { side } = useConfigStore();
  const isResizing = useRef(false);

  useEffect(() => {
    const updatePosition = async () => {
      if (isResizing.current) return;
      isResizing.current = true;
      
      try {
        // Call unified Rust command to handle both size and position atomically
        await invoke("update_window_bounds", { 
            isExpanded, 
            side 
        });
      } catch (e) {
        console.error("Failed to update window bounds via Rust:", e);
      } finally {
        // Reduced debounce time to make it feel more responsive
        setTimeout(() => { isResizing.current = false; }, 100);
      }
    };

    updatePosition();
    
    // Listen for window events to keep in sync if monitor/res changes
    const unlistenPromise = getCurrentWindow().onResized(() => {
        if (!isResizing.current) updatePosition();
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [side, isExpanded]);
}
