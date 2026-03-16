import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { useConfigStore } from "../stores/configStore";
import { useToastStore } from "../stores/toastStore";

export function useTraySync() {
  const { setSide, setTheme, toggleAutoStart } = useConfigStore();
  const addToast = useToastStore((s) => s.addToast);
  const isSettingUp = useRef(false);

  useEffect(() => {
    if (isSettingUp.current) return;
    isSettingUp.current = true;

    const unlisteners: Array<() => void> = [];

    const setup = async () => {
      const uSide = await listen("tray-toggle-side", () => {
        const nextSide = useConfigStore.getState().side === "left" ? "right" : "left";
        setSide(nextSide);
        addToast(`Moved to ${nextSide}`, "info");
      });
      unlisteners.push(uSide);

      const uTheme = await listen("tray-toggle-theme", () => {
        const nextTheme = useConfigStore.getState().theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        addToast(`Switched to ${nextTheme} theme`, "info");
      });
      unlisteners.push(uTheme);

      const uAuto = await listen("tray-toggle-autostart", async () => {
        await toggleAutoStart();
        const nextValue = useConfigStore.getState().autoStart;
        addToast(nextValue ? "Auto-start enabled" : "Auto-start disabled", "info");
      });
      unlisteners.push(uAuto);
    };

    setup();

    return () => {
      unlisteners.forEach(fn => fn());
      isSettingUp.current = false;
    };
  }, [setSide, setTheme, toggleAutoStart, addToast]);
}
