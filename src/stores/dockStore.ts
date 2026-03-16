import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";
import type { DockStack, DockItem } from "../types/dock";

const STORE_FILE = "dock-data.json";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

type DockState = {
  stacks: DockStack[];
  isLoaded: boolean;

  // Stack CRUD
  addStack: (name: string) => void;
  removeStack: (stackId: string) => void;
  renameStack: (stackId: string, newName: string) => void;
  toggleStack: (stackId: string) => void;
  reorderStacks: (fromIndex: number, toIndex: number) => void;
  reorderItems: (
    stackId: string,
    fromIndex: number,
    toIndex: number
  ) => void;

  // Item CRUD
  addItem: (
    stackId: string,
    item: Omit<DockItem, "id" | "createdAt">
  ) => void;
  removeItem: (stackId: string, itemId: string) => void;
  renameItem: (stackId: string, itemId: string, newName: string) => void;
  checkPaths: () => Promise<void>;

  // Persistence
  loadFromStore: () => Promise<void>;
  saveToStore: () => Promise<void>;
};

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

const debouncedSave = (saveFunc: () => Promise<void>) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveFunc();
  }, 500);
};

export const useDockStore = create<DockState>((set, get) => ({
  stacks: [],
  isLoaded: false,

  addStack: (name: string) => {
    const newStack: DockStack = {
      id: generateId(),
      name,
      items: [],
      isExpanded: false,
      createdAt: Date.now(),
    };
    set((state) => ({ stacks: [...state.stacks, newStack] }));
    debouncedSave(get().saveToStore);
  },

  removeStack: (stackId: string) => {
    set((state) => ({
      stacks: state.stacks.filter((s) => s.id !== stackId),
    }));
    debouncedSave(get().saveToStore);
  },

  renameStack: (stackId: string, newName: string) => {
    set((state) => ({
      stacks: state.stacks.map((s) =>
        s.id === stackId ? { ...s, name: newName } : s
      ),
    }));
    debouncedSave(get().saveToStore);
  },

  toggleStack: (stackId: string) => {
    set((state) => ({
      stacks: state.stacks.map((s) =>
        s.id === stackId ? { ...s, isExpanded: !s.isExpanded } : s
      ),
    }));
    debouncedSave(get().saveToStore);
  },

  reorderStacks: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const stacks = [...state.stacks];
      const [moved] = stacks.splice(fromIndex, 1);
      stacks.splice(toIndex, 0, moved);
      return { stacks };
    });
    debouncedSave(get().saveToStore);
  },

  reorderItems: (stackId, fromIndex, toIndex) => {
    set((state) => ({
      stacks: state.stacks.map((s) => {
        if (s.id !== stackId) return s;
        const items = [...s.items];
        const [moved] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, moved);
        return { ...s, items };
      }),
    }));
    debouncedSave(get().saveToStore);
  },

  addItem: (stackId, item) => {
    const newItem: DockItem = {
      ...item,
      id: generateId(),
      createdAt: Date.now(),
    };
    set((state) => ({
      stacks: state.stacks.map((s) =>
        s.id === stackId ? { ...s, items: [...s.items, newItem] } : s
      ),
    }));
    debouncedSave(get().saveToStore);
  },

  removeItem: (stackId: string, itemId: string) => {
    set((state) => ({
      stacks: state.stacks.map((s) =>
        s.id === stackId
          ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
          : s
      ),
    }));
    debouncedSave(get().saveToStore);
  },

  renameItem: (stackId: string, itemId: string, newName: string) => {
    set((state) => ({
      stacks: state.stacks.map((s) =>
        s.id === stackId
          ? {
              ...s,
              items: s.items.map((i) =>
                i.id === itemId ? { ...i, name: newName } : i
              ),
            }
          : s
      ),
    }));
    debouncedSave(get().saveToStore);
  },

  checkPaths: async () => {
    const { stacks } = get();
    const updatedStacks = await Promise.all(
      stacks.map(async (stack) => {
        const updatedItems = await Promise.all(
          stack.items.map(async (item) => {
            try {
              const exists = await invoke<boolean>("path_exists", { path: item.path });
              return { ...item, isValid: exists };
            } catch {
              return { ...item, isValid: false };
            }
          })
        );
        return { ...stack, items: updatedItems };
      })
    );
    set({ stacks: updatedStacks });
  },

  loadFromStore: async () => {
    try {
      const store = await load(STORE_FILE);
      const stacks = await store.get<DockStack[]>("stacks");
      if (stacks) {
        set({ stacks, isLoaded: true });
        // Validate paths on load
        get().checkPaths();
      } else {
        set({ isLoaded: true });
      }
    } catch (e) {
      console.error("Failed to load dock data:", e);
      set({ isLoaded: true });
    }
  },

  saveToStore: async () => {
    try {
      const store = await load(STORE_FILE);
      await store.set("stacks", get().stacks);
      await store.save();
    } catch (e) {
      console.error("Failed to save dock data:", e);
    }
  },
}));
