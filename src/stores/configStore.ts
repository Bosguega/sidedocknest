import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import type { DockSide, AppTheme } from "../types/dock";
import { useToastStore } from "./toastStore";

const STORE_FILE = "config.json";

// Cache the store instance to avoid reloading on every operation
type TauriStore = Awaited<ReturnType<typeof load>>;
let _configStore: TauriStore | null = null;
const getStore = async (): Promise<TauriStore> => {
  if (!_configStore) _configStore = await load(STORE_FILE);
  return _configStore;
};

// Debounce save to avoid multiple concurrent writes on rapid changes
let _saveTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSaveConfig = (saveFunc: () => Promise<void>) => {
  if (_saveTimeout) clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(() => saveFunc(), 300);
};

type ConfigState = {
  side: DockSide;
  theme: AppTheme;
  autoStart: boolean;
  isLoaded: boolean;

  setSide: (side: DockSide) => void;
  setTheme: (theme: AppTheme) => void;
  toggleAutoStart: () => Promise<void>;

  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  side: "left",
  theme: "dark",
  autoStart: false,
  isLoaded: false,

  setSide: (side: DockSide) => {
    set({ side });
    debouncedSaveConfig(get().saveConfig);
    useToastStore.getState().addToast(`Moved to ${side}`, "info");
  },

  setTheme: (theme: AppTheme) => {
    set({ theme });
    debouncedSaveConfig(get().saveConfig);
    useToastStore.getState().addToast(`Switched to ${theme} theme`, "info");
  },

  toggleAutoStart: async () => {
    const nextValue = !get().autoStart;
    try {
      if (nextValue) {
        await enable();
      } else {
        await disable();
      }
      set({ autoStart: nextValue });
      await get().saveConfig();
      useToastStore
        .getState()
        .addToast(
          nextValue ? "Auto-start enabled" : "Auto-start disabled",
          "info",
        );
    } catch (e) {
      console.error("Failed to toggle autostart:", e);
    }
  },

  loadConfig: async () => {
    try {
      const store = await getStore();
      const side = await store.get<DockSide>("side");
      const theme = await store.get<AppTheme>("theme");

      // Always read autoStart from the real system state
      const systemEnabled = await isEnabled();

      set({
        side: side || "left",
        theme: theme || "dark",
        autoStart: systemEnabled,
        isLoaded: true,
      });
    } catch (e) {
      console.error("Failed to load config:", e);
      set({ isLoaded: true });
    }
  },

  saveConfig: async () => {
    try {
      const state = get();
      const store = await getStore();
      await store.set("side", state.side);
      await store.set("theme", state.theme);
      // autoStart is intentionally not saved here — it is always read from
      // the OS via isEnabled() on load, so persisting it would be redundant.
      await store.save();
    } catch (e) {
      console.error("Failed to save config:", e);
    }
  },
}));
