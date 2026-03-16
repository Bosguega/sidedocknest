import { useEffect } from "react";
import { useConfigStore } from "../stores/configStore";
import { systemBridge } from "../bridge/system";

export function useTraySync() {
  const { setSide, setTheme, toggleAutoStart } = useConfigStore();

  useEffect(() => {
    let unlistenSide: (() => void) | null = null;
    let unlistenTheme: (() => void) | null = null;
    let unlistenAuto: (() => void) | null = null;

    const setup = async () => {
      unlistenSide = await systemBridge.onTrayToggleSide(() => {
        const nextSide =
          useConfigStore.getState().side === "left" ? "right" : "left";
        setSide(nextSide);
        // Toast is emitted inside setSide (configStore)
      });

      unlistenTheme = await systemBridge.onTrayToggleTheme(() => {
        const nextTheme =
          useConfigStore.getState().theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        // Toast is emitted inside setTheme (configStore)
      });

      unlistenAuto = await systemBridge.onTrayToggleAutostart(async () => {
        await toggleAutoStart();
        // Toast is emitted inside toggleAutoStart (configStore)
      });
    };

    setup();

    return () => {
      if (unlistenSide) unlistenSide();
      if (unlistenTheme) unlistenTheme();
      if (unlistenAuto) unlistenAuto();
    };
  }, [setSide, setTheme, toggleAutoStart]);
}
