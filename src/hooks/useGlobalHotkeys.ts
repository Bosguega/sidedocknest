import { useEffect, useRef } from "react";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";

export function useGlobalHotkeys(onToggle: () => void) {
  const isSettingUp = useRef(false);

  useEffect(() => {
    if (isSettingUp.current) return;
    isSettingUp.current = true;

    const shortcut = "Alt+Space";

    const setup = async () => {
      try {
        await register(shortcut, (event) => {
          if (event.state === "Pressed") {
            onToggle();
          }
        });
      } catch (e) {
        console.error("Failed to register global shortcut:", e);
      }
    };

    setup();

    return () => {
      unregister(shortcut).catch(console.error);
      isSettingUp.current = false;
    };
  }, [onToggle]);
}
