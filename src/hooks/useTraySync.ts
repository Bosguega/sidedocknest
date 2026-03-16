import { useEffect } from "react";
import { useConfigStore } from "../stores/configStore";
import { useToastStore } from "../stores/toastStore";
import { systemBridge } from "../bridge/system";

export function useTraySync() {
  const { setSide, setTheme, toggleAutoStart } = useConfigStore();
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    let unlistenSide: (() => void) | null = null;
    let unlistenTheme: (() => void) | null = null;
    let unlistenAuto: (() => void) | null = null;

    const setup = async () => {
      unlistenSide = await systemBridge.onTrayToggleSide(() => {
        const nextSide = useConfigStore.getState().side === "left" ? "right" : "left";
        setSide(nextSide);
        addToast(`Moved to ${nextSide}`, "info");
      });

      unlistenTheme = await systemBridge.onTrayToggleTheme(() => {
        const nextTheme = useConfigStore.getState().theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        addToast(`Switched to ${nextTheme} theme`, "info");
      });

      unlistenAuto = await systemBridge.onTrayToggleAutostart(async () => {
        await toggleAutoStart();
        const nextValue = useConfigStore.getState().autoStart;
        addToast(nextValue ? "Auto-start enabled" : "Auto-start disabled", "info");
      });
    };

    setup();

    return () => {
      if (unlistenSide) unlistenSide();
      if (unlistenTheme) unlistenTheme();
      if (unlistenAuto) unlistenAuto();
    };
  }, [setSide, setTheme, toggleAutoStart, addToast]);
}
