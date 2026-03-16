import React from "react";
import ReactDOM from "react-dom";

type Props = {
  x: number;
  y: number;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Renders the context menu as a React Portal directly into document.body,
 * escaping any overflow:hidden / overflow:auto ancestor that would clip it.
 *
 * Position is expressed in viewport coordinates (clientX / clientY from the
 * triggering mouse event) and clamped so the menu never overflows the screen.
 */
export const ContextMenu: React.FC<Props> = ({ x, y, onClose, children }) => {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ x, y });

  // After the first paint we know the menu's rendered dimensions — clamp it
  // so it never overflows the viewport edges.
  React.useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 8;
    setPos({
      x: x + width  > vw ? Math.max(MARGIN, vw - width  - MARGIN) : x,
      y: y + height > vh ? Math.max(MARGIN, vh - height - MARGIN) : y,
    });
  }, [x, y]);

  // Close on any click that falls outside the menu.
  // Using capture phase so we catch clicks even on elements that call
  // stopPropagation (e.g. other buttons in the sidebar).
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [onClose]);

  // Close when the user scrolls anywhere (the menu position would become stale).
  React.useEffect(() => {
    document.addEventListener("scroll", onClose, true);
    return () => document.removeEventListener("scroll", onClose, true);
  }, [onClose]);

  // Close on Escape key.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="context-menu"
      style={{ position: "fixed", left: pos.x, top: pos.y }}
    >
      {children}
    </div>,
    document.body,
  );
};
