import { useEffect, useRef } from "react";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";

export function useGlobalHotkeys(onToggle: () => void) {
  // Always keep a ref pointing to the latest version of the callback.
  // This way the shortcut handler never holds a stale closure, without
  // needing to re-register the shortcut on every render.
  const onToggleRef = useRef(onToggle);

  useEffect(() => {
    onToggleRef.current = onToggle;
  });

  useEffect(() => {
    const shortcut = "Alt+Space";

    const setup = async () => {
      try {
        await register(shortcut, (event) => {
          if (event.state === "Pressed") {
            onToggleRef.current();
          }
        });
      } catch (e) {
        console.error("Failed to register global shortcut:", e);
      }
    };

    setup();

    // Unregister only on unmount — no re-registration on callback changes.
    return () => {
      unregister(shortcut).catch(console.error);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
