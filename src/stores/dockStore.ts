import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { commands } from "../bridge/commands";
import type { DockStack, DockItem } from "../types/dock";

const STORE_FILE = "dock-data.json";

// Cache the store instance to avoid reloading on every operation
type TauriStore = Awaited<ReturnType<typeof load>>;
let _dockStore: TauriStore | null = null;
const getStore = async (): Promise<TauriStore> => {
  if (!_dockStore) _dockStore = await load(STORE_FILE);
  return _dockStore;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Returns true if the icon value is a valid new-format cache filename
 * (e.g. "a3f1b2c4d5e6f708.png") as opposed to a legacy base64 blob.
 *
 * New format:  exactly 16 lowercase hex chars + ".png"
 * Old format:  a long base64 string (contains "+", "/", upper-case, etc.)
 */
function isValidIconHash(icon: string | undefined): icon is string {
  return typeof icon === "string" && /^[0-9a-f]{16}\.png$/.test(icon);
}

type DockState = {
  stacks: DockStack[];
  isLoaded: boolean;

  // Stack CRUD
  // Returns the ID of the newly created stack.
  addStack: (name: string) => string;
  removeStack: (stackId: string) => void;
  renameStack: (stackId: string, newName: string) => void;
  toggleStack: (stackId: string) => void;
  reorderStacks: (fromIndex: number, toIndex: number) => void;
  reorderItems: (stackId: string, fromIndex: number, toIndex: number) => void;

  // Item CRUD
  // Returns true if the item was added, false if a duplicate path already
  // exists in the target stack.
  addItem: (
    stackId: string,
    item: Omit<DockItem, "id" | "createdAt">,
  ) => boolean;
  removeItem: (stackId: string, itemId: string) => void;
  renameItem: (stackId: string, itemId: string, newName: string) => void;
  moveItem: (
    sourceStackId: string,
    targetStackId: string,
    itemId: string,
    newIndex: number,
  ) => void;
  checkPaths: () => Promise<void>;

  // Icon cache
  // Re-extracts icons for every item that does not yet have a valid hash icon.
  // Safe to call fire-and-forget; saves automatically when done.
  refreshIcons: () => Promise<void>;

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

  addStack: (name: string): string => {
    const newStack: DockStack = {
      id: generateId(),
      name,
      items: [],
      isExpanded: false,
      createdAt: Date.now(),
    };
    set((state) => ({ stacks: [...state.stacks, newStack] }));
    debouncedSave(get().saveToStore);
    return newStack.id;
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
        s.id === stackId ? { ...s, name: newName } : s,
      ),
    }));
    debouncedSave(get().saveToStore);
  },

  toggleStack: (stackId: string) => {
    set((state) => ({
      stacks: state.stacks.map((s) =>
        s.id === stackId ? { ...s, isExpanded: !s.isExpanded } : s,
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
    const targetStack = get().stacks.find((s) => s.id === stackId);
    if (!targetStack) return false;

    // Prevent duplicate paths within the same stack
    const isDuplicate = targetStack.items.some((i) => i.path === item.path);
    if (isDuplicate) return false;

    const newItem: DockItem = {
      ...item,
      id: generateId(),
      createdAt: Date.now(),
    };
    set((state) => ({
      stacks: state.stacks.map((s) =>
        s.id === stackId ? { ...s, items: [...s.items, newItem] } : s,
      ),
    }));
    debouncedSave(get().saveToStore);
    return true;
  },

  removeItem: (stackId: string, itemId: string) => {
    set((state) => ({
      stacks: state.stacks.map((s) =>
        s.id === stackId
          ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
          : s,
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
                i.id === itemId ? { ...i, name: newName } : i,
              ),
            }
          : s,
      ),
    }));
    debouncedSave(get().saveToStore);
  },

  moveItem: (sourceStackId, targetStackId, itemId, newIndex) => {
    set((state) => {
      const sourceStack = state.stacks.find((s) => s.id === sourceStackId);
      if (!sourceStack) return state;

      if (sourceStackId === targetStackId) {
        // Intra-stack reordering
        const items = [...sourceStack.items];
        const oldIndex = items.findIndex((i) => i.id === itemId);
        if (oldIndex === -1) return state;
        const [moved] = items.splice(oldIndex, 1);
        items.splice(newIndex, 0, moved);

        return {
          stacks: state.stacks.map((s) =>
            s.id === sourceStackId ? { ...s, items } : s,
          ),
        };
      } else {
        // Inter-stack movement
        const targetStack = state.stacks.find((s) => s.id === targetStackId);
        if (!targetStack) return state;

        const sourceItems = [...sourceStack.items];
        const itemIndex = sourceItems.findIndex((i) => i.id === itemId);
        if (itemIndex === -1) return state;
        const [moved] = sourceItems.splice(itemIndex, 1);

        const targetItems = [...targetStack.items];
        targetItems.splice(newIndex, 0, moved);

        return {
          stacks: state.stacks.map((s) => {
            if (s.id === sourceStackId) return { ...s, items: sourceItems };
            if (s.id === targetStackId) return { ...s, items: targetItems };
            return s;
          }),
        };
      }
    });
    debouncedSave(get().saveToStore);
  },

  checkPaths: async () => {
    const { stacks } = get();
    const updatedStacks = await Promise.all(
      stacks.map(async (stack) => {
        const updatedItems = await Promise.all(
          stack.items.map(async (item) => {
            try {
              const exists = (await commands.pathExists(item.path)) as boolean;
              return { ...item, isValid: exists };
            } catch {
              return { ...item, isValid: false };
            }
          }),
        );
        return { ...stack, items: updatedItems };
      }),
    );
    set({ stacks: updatedStacks });
  },

  refreshIcons: async () => {
    const { stacks } = get();
    let changed = false;

    const updatedStacks = await Promise.all(
      stacks.map(async (stack) => {
        const updatedItems = await Promise.all(
          stack.items.map(async (item) => {
            // Skip items that already have a valid cached icon hash
            if (isValidIconHash(item.icon)) return item;

            try {
              const iconHash = (await commands.extractIcon(
                item.path,
              )) as string;
              changed = true;
              return { ...item, icon: iconHash };
            } catch {
              // Path may not exist or icon extraction failed — keep item as-is
              return item;
            }
          }),
        );
        return { ...stack, items: updatedItems };
      }),
    );

    if (changed) {
      set({ stacks: updatedStacks });
      debouncedSave(get().saveToStore);
    }
  },

  loadFromStore: async () => {
    try {
      const store = await getStore();
      const rawStacks = await store.get<DockStack[]>("stacks");

      if (rawStacks) {
        // ── Icon migration ──────────────────────────────────────────────────
        // Old format stored full base64 PNG blobs in the icon field.
        // New format stores only a short hash filename (e.g. "a3f1b2c4.png").
        // Strip any value that doesn't match the new format so refreshIcons()
        // can re-extract them into the persistent disk cache.
        const stacks = rawStacks.map((s) => ({
          ...s,
          items: s.items.map((item) => ({
            ...item,
            icon: isValidIconHash(item.icon) ? item.icon : undefined,
          })),
        }));

        set({ stacks, isLoaded: true });

        // Fire-and-forget background tasks
        get().checkPaths();
        get().refreshIcons();
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
      const store = await getStore();
      // Strip the transient `isValid` field before persisting — it is always
      // recomputed via checkPaths() on load, so saving it would only cause
      // stale validity state on the next startup.
      const stacksToSave = get().stacks.map((s) => ({
        ...s,
        items: s.items.map((item) => {
          const saved = { ...item };
          delete saved.isValid;
          return saved;
        }),
      }));
      await store.set("stacks", stacksToSave);
      await store.save();
    } catch (e) {
      console.error("Failed to save dock data:", e);
    }
  },
}));
