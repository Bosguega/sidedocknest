import { useEffect, useRef } from "react";
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useConfigStore } from "../stores/configStore";

type MonitorInfo = {
  x: number;
  y: number;
  width: number;
  height: number;
  work_x: number;
  work_y: number;
  work_width: number;
  work_height: number;
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
        
        // Set physical size (height matches monitor's work area exactly)
        await window.setSize(new PhysicalSize(targetPhysWidth, monitor.work_height));
        
        // Set physical position relative to monitor offset within work area
        const xPos = side === "left" 
          ? monitor.work_x 
          : monitor.work_x + monitor.work_width - targetPhysWidth;
        
        await window.setPosition(new PhysicalPosition(xPos, monitor.work_y));
        
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
