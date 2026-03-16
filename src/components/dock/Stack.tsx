import React from "react";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Modal } from "../common/Modal";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DockItem } from "./DockItem";
import type { DockStack as DockStackType } from "../../types/dock";
import { useDockStore } from "../../stores/dockStore";
import { useToastStore } from "../../stores/toastStore";

type Props = {
  stack: DockStackType;
};

export const Stack: React.FC<Props> = ({ stack }) => {
  const {
    stacks,
    toggleStack,
    removeItem,
    removeStack,
    renameStack,
    reorderStacks,
  } = useDockStore();
  const addToast = useToastStore((s) => s.addToast);
  const [showContext, setShowContext] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(stack.name);
  const contextRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Setup sortable for the stack itself
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: stack.id,
    data: {
      type: "stack",
      stack,
    },
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const handleToggle = () => {
    if (!isEditing) toggleStack(stack.id);
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
    if (trimmed.length > 0 && trimmed !== stack.name) {
      renameStack(stack.id, trimmed);
      addToast(`Stack renamed to "${trimmed}"`, "info");
    } else {
      setEditName(stack.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirmRename();
    if (e.key === "Escape") {
      setEditName(stack.name);
      setIsEditing(false);
    }
  };

  const handleDeleteStack = () => {
    setShowContext(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    removeStack(stack.id);
    addToast(`Stack "${stack.name}" deleted`, "warning");
    setShowDeleteConfirm(false);
  };

  const handleMoveUp = () => {
    const index = stacks.findIndex((s) => s.id === stack.id);
    if (index > 0) {
      reorderStacks(index, index - 1);
    }
    setShowContext(false);
  };

  const handleMoveDown = () => {
    const index = stacks.findIndex((s) => s.id === stack.id);
    if (index < stacks.length - 1) {
      reorderStacks(index, index + 1);
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

  const index = stacks.findIndex((s) => s.id === stack.id);

  return (
    <div
      className="stack"
      onContextMenu={handleContextMenu}
      ref={setNodeRef}
      style={style}
    >
      <div
        className="stack-header"
        onClick={handleToggle}
        onDoubleClick={handleRenameTrigger}
        {...attributes}
        {...listeners}
      >
        <span className="stack-chevron">
          {stack.isExpanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
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
          <span className="stack-name">{stack.name}</span>
        )}

        <span className="stack-count">{stack.items.length}</span>
      </div>

      {stack.isExpanded && (
        <div className="stack-items">
          {stack.items.length === 0 ? (
            <div className="stack-empty">Drop files here</div>
          ) : (
            <SortableContext
              items={stack.items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {stack.items.map((item) => (
                <DockItem
                  key={item.id}
                  item={item}
                  stackId={stack.id}
                  onRemove={removeItem}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}

      {showContext && (
        <div className="context-menu" ref={contextRef}>
          <button className="context-menu-item" onClick={handleRenameTrigger}>
            <Edit2 size={13} />
            <span>Rename Stack</span>
          </button>

          <div className="context-menu-divider" />

          <button
            className="context-menu-item"
            onClick={handleMoveUp}
            disabled={index === 0}
          >
            <ArrowUp size={13} />
            <span>Move Up</span>
          </button>
          <button
            className="context-menu-item"
            onClick={handleMoveDown}
            disabled={index === stacks.length - 1}
          >
            <ArrowDown size={13} />
            <span>Move Down</span>
          </button>

          <div className="context-menu-divider" />

          <button
            className="context-menu-item context-menu-item--danger"
            onClick={handleDeleteStack}
          >
            <Trash2 size={13} />
            <span>Delete Stack</span>
          </button>
        </div>
      )}
      <Modal
        title="Delete Stack"
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <div className="confirm-dialog">
          <p className="confirm-dialog-message">
            Delete stack <strong>"{stack.name}"</strong> and all its{" "}
            {stack.items.length} item{stack.items.length !== 1 ? "s" : ""}?
          </p>
          <div className="confirm-dialog-actions">
            <button
              className="confirm-btn confirm-btn--cancel"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="confirm-btn confirm-btn--danger"
              onClick={handleConfirmDelete}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
