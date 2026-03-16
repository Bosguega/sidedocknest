import { useEffect, useRef } from "react";
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useConfigStore } from "../stores/configStore";

type MonitorInfo = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function useWindowPosition(isExpanded: boolean) {
  const { side } = useConfigStore();
  const isResizing = useRef(false);

  useEffect(() => {
    const updatePosition = async () => {
      if (isResizing.current) return;
      isResizing.current = true;
      
      try {
        const window = getCurrentWindow();
        
        // Get active monitor info (where the window is currently)
        const monitor = await invoke<MonitorInfo>("get_active_monitor_info");
        
        // Logical widths
        const expandedWidth = 220;
        const collapsedWidth = 22;
        const targetLogicalWidth = isExpanded ? expandedWidth : collapsedWidth;
        
        // Convert logical width to physical pixels
        const scale = await window.scaleFactor();
        const targetPhysWidth = Math.round(targetLogicalWidth * scale);
        
        // Set physical size (height matches monitor exactly)
        await window.setSize(new PhysicalSize(targetPhysWidth, monitor.height));
        
        // Set physical position relative to monitor offset
        const xPos = side === "left" 
          ? monitor.x 
          : monitor.x + monitor.width - targetPhysWidth;
        
        await window.setPosition(new PhysicalPosition(xPos, monitor.y));
        
      } catch (e) {
        console.error("Failed to update window position:", e);
      } finally {
        setTimeout(() => { isResizing.current = false; }, 150);
      }
    };

    updatePosition();
    
    const unlistenPromise = getCurrentWindow().onResized(() => {
        if (!isResizing.current) updatePosition();
    });

    const unlistenMovedPromise = getCurrentWindow().onMoved(() => {
        if (!isResizing.current) updatePosition();
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
      unlistenMovedPromise.then(unlisten => unlisten());
    };
  }, [side, isExpanded]);
}
