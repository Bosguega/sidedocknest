import { useEffect, useRef } from "react";
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
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
        const window = getCurrentWindow();
        
        // Get physical monitor size from Rust
        const [physScreenWidth, physScreenHeight] = await invoke<[number, number]>("get_screen_size");
        
        // Logical widths
        const expandedWidth = 220;
        const collapsedWidth = 22;
        const targetLogicalWidth = isExpanded ? expandedWidth : collapsedWidth;
        
        // Convert logical width to physical pixels
        const scale = await window.scaleFactor();
        const targetPhysWidth = Math.round(targetLogicalWidth * scale);
        
        // Set physical size (height matches monitor exactly)
        await window.setSize(new PhysicalSize(targetPhysWidth, physScreenHeight));
        
        // Set physical position
        const xPos = side === "left" ? 0 : physScreenWidth - targetPhysWidth;
        await window.setPosition(new PhysicalPosition(xPos, 0));
        
      } catch (e) {
        console.error("Failed to update window position:", e);
      } finally {
        // Debounce flag reset
        setTimeout(() => { isResizing.current = false; }, 150);
      }
    };

    updatePosition();
    
    // Safety re-sync
    const unlistenPromise = getCurrentWindow().onResized(() => {
        if (!isResizing.current) updatePosition();
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [side, isExpanded]);
}
