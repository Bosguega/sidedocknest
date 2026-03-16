import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import type { DockSide, AppTheme } from "../types/dock";

const STORE_FILE = "config.json";

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
    get().saveConfig();
  },

  setTheme: (theme: AppTheme) => {
    set({ theme });
    get().saveConfig();
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
    } catch (e) {
      console.error("Failed to toggle autostart:", e);
    }
  },

  loadConfig: async () => {
    try {
      const store = await load(STORE_FILE);
      const side = await store.get<DockSide>("side");
      const theme = await store.get<AppTheme>("theme");
      
      // Check real system status
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
      const store = await load(STORE_FILE);
      await store.set("side", state.side);
      await store.set("theme", state.theme);
      await store.set("autoStart", state.autoStart);
      await store.save();
    } catch (e) {
      console.error("Failed to save config:", e);
    }
  },
}));
