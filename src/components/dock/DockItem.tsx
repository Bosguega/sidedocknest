import React from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { commands } from "../../bridge/commands";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AppWindow,
  Folder,
  File,
  ExternalLink,
  Trash2,
  FolderOpen,
  Edit2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
} from "lucide-react";
import type { DockItem as DockItemType } from "../../types/dock";
import { useDockStore } from "../../stores/dockStore";
import { useToastStore } from "../../stores/toastStore";

type Props = {
  item: DockItemType;
  stackId: string;
  onRemove: (stackId: string, itemId: string) => void;
};

export const DockItem: React.FC<Props> = ({ item, stackId, onRemove }) => {
  // Narrow selectors — this component only re-renders when its own stack changes,
  // not on every dock-wide state update.
  const stack = useDockStore((s) => s.stacks.find((st) => st.id === stackId));
  const renameItem = useDockStore((s) => s.renameItem);
  const reorderItems = useDockStore((s) => s.reorderItems);
  const addToast = useToastStore((s) => s.addToast);

  const [showContext, setShowContext] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(item.name);
  // Reset icon error state whenever the item's icon changes (e.g. after refreshIcons)
  const [iconLoadError, setIconLoadError] = React.useState(false);
  React.useEffect(() => {
    setIconLoadError(false);
  }, [item.icon]);
  const contextRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: "item",
      item,
      stackId,
    },
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 20 : 1,
  };

  const itemIndex = stack ? stack.items.findIndex((i) => i.id === item.id) : -1;

  const handleClick = async () => {
    if (isEditing) return;
    try {
      await commands.openFile(item.path);
    } catch (e) {
      console.error("Failed to open:", e);
      addToast(`Failed to open: ${item.name}`, "error");
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContext(true);
  };

  const handleRenameTrigger = () => {
    setIsEditing(true);
    setShowContext(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleConfirmRename = () => {
    const trimmed = editName.trim();
    if (trimmed.length > 0 && trimmed !== item.name) {
      renameItem(stackId, item.id, trimmed);
      addToast(`Item renamed to "${trimmed}"`, "info");
    } else {
      setEditName(item.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirmRename();
    if (e.key === "Escape") {
      setEditName(item.name);
      setIsEditing(false);
    }
  };

  const handleOpenLocation = async () => {
    try {
      await commands.openFileLocation(item.path);
    } catch (e) {
      console.error("Failed to open location:", e);
      addToast("Failed to open file location", "error");
    }
    setShowContext(false);
  };

  const handleRemove = () => {
    onRemove(stackId, item.id);
    addToast(`"${item.name}" removed`, "warning");
    setShowContext(false);
  };

  const handleMoveUp = () => {
    if (itemIndex > 0) {
      reorderItems(stackId, itemIndex, itemIndex - 1);
    }
    setShowContext(false);
  };

  const handleMoveDown = () => {
    if (stack && itemIndex < stack.items.length - 1) {
      reorderItems(stackId, itemIndex, itemIndex + 1);
    }
    setShowContext(false);
  };

  // Close context menu on outside click
  React.useEffect(() => {
    if (!showContext) return;
    const handler = (e: MouseEvent) => {
      if (
        contextRef.current &&
        !contextRef.current.contains(e.target as Node)
      ) {
        setShowContext(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showContext]);

  const getFallbackIcon = () => {
    switch (item.type) {
      case "app":
        return <AppWindow size={16} />;
      case "folder":
        return <Folder size={16} />;
      case "file":
        return <File size={16} />;
      default:
        return <File size={16} />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`dock-item-wrapper ${item.isValid === false ? "dock-item-wrapper--invalid" : ""}`}
    >
      <div
        className="dock-item"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleRenameTrigger}
        title={
          item.isValid === false ? `PATH NOT FOUND: ${item.path}` : item.path
        }
        {...attributes}
        {...listeners}
      >
        <span className="dock-item-icon">
          {item.isValid === false ? (
            <AlertCircle size={16} className="text-danger" />
          ) : item.icon && !iconLoadError ? (
            <img
              src={convertFileSrc(item.icon, "icon")}
              alt={item.name}
              width={16}
              height={16}
              onError={() => setIconLoadError(true)}
            />
          ) : (
            getFallbackIcon()
          )}
        </span>

        {isEditing ? (
          <input
            ref={inputRef}
            className="inline-edit-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleConfirmRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="dock-item-name">{item.name}</span>
        )}
      </div>

      {showContext && (
        <div className="context-menu" ref={contextRef}>
          <button className="context-menu-item" onClick={handleClick}>
            <ExternalLink size={13} />
            <span>Open</span>
          </button>
          <button className="context-menu-item" onClick={handleOpenLocation}>
            <FolderOpen size={13} />
            <span>Open File Location</span>
          </button>
          <button className="context-menu-item" onClick={handleRenameTrigger}>
            <Edit2 size={13} />
            <span>Rename Item</span>
          </button>

          <div className="context-menu-divider" />

          <button
            className="context-menu-item"
            onClick={handleMoveUp}
            disabled={itemIndex <= 0}
          >
            <ArrowUp size={13} />
            <span>Move Up</span>
          </button>
          <button
            className="context-menu-item"
            onClick={handleMoveDown}
            disabled={!stack || itemIndex >= stack.items.length - 1}
          >
            <ArrowDown size={13} />
            <span>Move Down</span>
          </button>

          <div className="context-menu-divider" />

          <button
            className="context-menu-item context-menu-item--danger"
            onClick={handleRemove}
          >
            <Trash2 size={13} />
            <span>Remove from Dock</span>
          </button>
        </div>
      )}
    </div>
  );
};
