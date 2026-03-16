import { useEffect, useRef } from "react";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";

export const TOGGLE_SHORTCUT = "Alt+Space";

export function useGlobalHotkeys(onToggle: () => void) {
  const onToggleRef = useRef(onToggle);

  useEffect(() => {
    onToggleRef.current = onToggle;
  });

  useEffect(() => {
    const setup = async () => {
      try {
        await register(TOGGLE_SHORTCUT, (event) => {
          if (event.state === "Pressed") {
            onToggleRef.current();
          }
        });
      } catch (e) {
        console.error("Failed to register global shortcut:", e);
      }
    };

    setup();

    return () => {
      unregister(TOGGLE_SHORTCUT).catch(console.error);
    };
  }, []);
}
