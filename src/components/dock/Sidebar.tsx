import React from "react";
import {
  Plus,
  Settings,
  Sun,
  AlignRight,
  X,
  Zap,
  Search as SearchIcon,
  Sparkles,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

import { Stack } from "./Stack";
import { Modal } from "../common/Modal";
import { useDockStore } from "../../stores/dockStore";
import { useConfigStore } from "../../stores/configStore";
import { useToastStore } from "../../stores/toastStore";
import { useDragDrop } from "../../hooks/useDragDrop";
import { useWindowPosition } from "../../hooks/useWindowPosition";
import { useTraySync } from "../../hooks/useTraySync";
import { useGlobalHotkeys } from "../../hooks/useGlobalHotkeys";
import { processFile } from "../../utils/shortcutUtils";

type StartMenuItem = {
  name: string;
  path: string;
};

export const Sidebar: React.FC = () => {
  const {
    stacks,
    addStack,
    addItem,
    isLoaded,
    checkPaths,
    reorderStacks,
    moveItem,
  } = useDockStore();
  const { side, theme, autoStart, setSide, setTheme, toggleAutoStart } =
    useConfigStore();
  const addToast = useToastStore((s) => s.addToast);

  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const [showImport, setShowImport] = React.useState(false);

  const [newStackName, setNewStackName] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [importSearch, setImportSearch] = React.useState("");
  const [startApps, setStartApps] = React.useState<StartMenuItem[]>([]);
  const [isLoadingApps, setIsLoadingApps] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const expandTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const collapseTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Custom hooks
  useDragDrop();
  useWindowPosition(isExpanded);
  useTraySync();

  useGlobalHotkeys(() => {
    setIsExpanded((prev) => !prev);
    if (!isExpanded) {
      setTimeout(() => searchInputRef.current?.focus(), 200);
    }
  });

  // Periodic path validation
  React.useEffect(() => {
    if (!isLoaded) return;
    checkPaths();
    const interval = setInterval(() => checkPaths(), 300000);
    return () => clearInterval(interval);
  }, [isLoaded, checkPaths]);

  const handleMouseEnter = () => {
    if (collapseTimeout.current) {
      clearTimeout(collapseTimeout.current);
      collapseTimeout.current = null;
    }
    expandTimeout.current = setTimeout(() => setIsExpanded(true), 150);
  };

  const handleMouseLeave = () => {
    if (expandTimeout.current) {
      clearTimeout(expandTimeout.current);
      expandTimeout.current = null;
    }
    collapseTimeout.current = setTimeout(() => {
      if (!showImport) {
        setIsExpanded(false);
        setShowSettings(false);
        setIsAdding(false);
        setSearchQuery("");
      }
    }, 400);
  };

  const handleToggleAutoStart = async () => {
    await toggleAutoStart();
    const newValue = useConfigStore.getState().autoStart;
    addToast(newValue ? "Auto-start enabled" : "Auto-start disabled", "info");
  };

  const handleAddStack = () => {
    setIsAdding(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleConfirmAdd = () => {
    const trimmed = newStackName.trim();
    if (trimmed.length > 0 && trimmed.length <= 30) {
      addStack(trimmed);
      addToast(`Stack "${trimmed}" created`, "success");
    }
    setNewStackName("");
    setIsAdding(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;

    // Handle Stack Reordering
    if (activeType === "stack") {
      const oldIndex = stacks.findIndex((s) => s.id === active.id);
      const newIndex = stacks.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderStacks(oldIndex, newIndex);
        addToast("Stack reordered", "info");
      }
    }

    // Handle Item Movement
    if (activeType === "item") {
      const activeItem = active.data.current?.item;
      const sourceStackId = active.data.current?.stackId;

      // Target could be another item or a stack header
      let targetStackId =
        over.data.current?.stackId ||
        (over.data.current?.type === "stack" ? over.id : null);

      if (activeItem && sourceStackId && targetStackId) {
        const targetStack = stacks.find((s) => s.id === targetStackId);
        if (!targetStack) return;

        let newIndex = targetStack.items.length;
        if (over.data.current?.type === "item") {
          newIndex = targetStack.items.findIndex((i) => i.id === over.id);
        }

        moveItem(sourceStackId, targetStackId, activeItem.id, newIndex);
        addToast(`Moved ${activeItem.name}`, "info");
      }
    }
  };

  const handleOpenImport = async () => {
    setShowImport(true);
    setIsLoadingApps(true);
    try {
      const apps = await invoke<StartMenuItem[]>("list_start_menu_items");
      setStartApps(apps);
    } catch (e) {
      console.error("Failed to load start menu apps:", e);
      addToast("Failed to load apps", "error");
    } finally {
      setIsLoadingApps(false);
    }
  };

  const handleImportApp = async (app: StartMenuItem) => {
    let targetStackId = stacks[0]?.id;
    if (!targetStackId) {
      addStack("General");
      targetStackId = useDockStore.getState().stacks.at(-1)?.id;
    }

    if (targetStackId) {
      try {
        const processed = await processFile(app.path);
        const added = addItem(targetStackId, processed);
        if (added) {
          addToast(`Imported ${processed.name}`, "success");
        } else {
          addToast(`"${processed.name}" is already in this stack`, "warning");
        }
      } catch (e) {
        addToast(`Failed to import ${app.name}`, "error");
      }
    }
  };

  const filteredStartApps = startApps.filter((app) =>
    app.name.toLowerCase().includes(importSearch.toLowerCase()),
  );

  const filteredStacks = React.useMemo(() => {
    if (!searchQuery.trim()) return stacks;
    const query = searchQuery.toLowerCase();
    return stacks
      .map((stack) => {
        const matchStackName = stack.name.toLowerCase().includes(query);
        const filteredItems = stack.items.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            item.path.toLowerCase().includes(query),
        );
        if (matchStackName || filteredItems.length > 0) {
          return {
            ...stack,
            items: filteredItems,
            isExpanded: filteredItems.length > 0 ? true : stack.isExpanded,
          };
        }
        return null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }, [stacks, searchQuery]);

  if (!isLoaded) return null;

  return (
    <div
      className={`sidebar ${isExpanded ? "sidebar--expanded" : "sidebar--collapsed"} sidebar--${side}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!isExpanded && (
        <div className="sidebar-label">
          {"SideDockNest".split("").map((char, i) => (
            <span key={i} className="sidebar-label-char">
              {char}
            </span>
          ))}
        </div>
      )}

      {isExpanded && (
        <div className="sidebar-content">
          <div className="sidebar-header">
            <div className="search-container">
              <SearchIcon size={14} className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="search-clear-btn"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <div className="sidebar-stacks">
              {filteredStacks.length === 0 && searchQuery && (
                <div className="no-results">No matches found</div>
              )}
              <SortableContext
                items={filteredStacks.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredStacks.map((stack) => (
                  <Stack key={stack.id} stack={stack} />
                ))}
              </SortableContext>
            </div>
          </DndContext>

          <div className="sidebar-footer">
            {isAdding ? (
              <div className="add-stack-form">
                <input
                  ref={inputRef}
                  type="text"
                  className="add-stack-input"
                  placeholder="Stack name..."
                  value={newStackName}
                  onChange={(e) => setNewStackName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmAdd()}
                  onBlur={handleConfirmAdd}
                  maxLength={30}
                />
              </div>
            ) : showSettings ? (
              <div className="settings-controls">
                <button
                  className={`settings-icon-btn ${autoStart ? "settings-icon-btn--active" : ""}`}
                  onClick={handleToggleAutoStart}
                  title="Auto-start"
                >
                  <Zap size={14} />
                </button>
                <div className="divider-v" />
                <button
                  className="settings-icon-btn"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  <Sun size={14} />
                </button>
                <button
                  className="settings-icon-btn"
                  onClick={() => setSide(side === "left" ? "right" : "left")}
                >
                  <AlignRight size={14} />
                </button>
                <div className="spacer" />
                <button
                  className="settings-icon-btn"
                  onClick={() => setShowSettings(false)}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="footer-btns">
                <button className="add-stack-btn" onClick={handleAddStack}>
                  <Plus size={14} />
                  <span>Stack</span>
                </button>
                <button
                  className="settings-btn"
                  onClick={handleOpenImport}
                  title="Import Apps"
                >
                  <Sparkles size={14} />
                </button>
                <button
                  className="settings-btn"
                  onClick={() => setShowSettings(true)}
                  title="Settings"
                >
                  <Settings size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        title="Import from Start Menu"
        isOpen={showImport}
        onClose={() => setShowImport(false)}
      >
        <div className="import-modal-content">
          <div className="search-container mb-4">
            <SearchIcon size={14} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search apps..."
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
            />
          </div>

          <div className="start-menu-list">
            {isLoadingApps ? (
              <div className="loading-state">Scanning Start Menu...</div>
            ) : filteredStartApps.length === 0 ? (
              <div className="no-results">No apps found</div>
            ) : (
              filteredStartApps.map((app, idx) => (
                <button
                  key={idx}
                  className="start-menu-item"
                  onClick={() => handleImportApp(app)}
                >
                  <Sparkles
                    size={12}
                    className="text-accent"
                    style={{ opacity: 0.5 }}
                  />
                  <span className="start-menu-item-name">{app.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
