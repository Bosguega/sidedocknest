import React from "react";
import { Plus, Settings, Sun, Moon, AlignLeft, AlignRight, X, Zap } from "lucide-react";
import { Stack } from "./Stack";
import { useDockStore } from "../../stores/dockStore";
import { useConfigStore } from "../../stores/configStore";
import { useToastStore } from "../../stores/toastStore";
import { useDragDrop } from "../../hooks/useDragDrop";
import { useWindowPosition } from "../../hooks/useWindowPosition";
import { useTraySync } from "../../hooks/useTraySync";

export const Sidebar: React.FC = () => {
  const { stacks, addStack, isLoaded, checkPaths } = useDockStore();
  const { side, theme, autoStart, setSide, setTheme, toggleAutoStart } = useConfigStore();
  const addToast = useToastStore(s => s.addToast);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const [newStackName, setNewStackName] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const expandTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enable drag & drop
  useDragDrop();

  // Manage physical window size and position
  useWindowPosition(isExpanded);

  // Sync with system tray
  useTraySync();

  // Periodic path validation (every 5 minutes)
  React.useEffect(() => {
    if (!isLoaded) return;
    
    // Initial check
    checkPaths();
    
    const interval = setInterval(() => {
      checkPaths();
    }, 300000);
    
    return () => clearInterval(interval);
  }, [isLoaded, checkPaths]);

  const handleMouseEnter = () => {
    if (collapseTimeout.current) {
      clearTimeout(collapseTimeout.current);
      collapseTimeout.current = null;
    }
    expandTimeout.current = setTimeout(() => {
      setIsExpanded(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (expandTimeout.current) {
      clearTimeout(expandTimeout.current);
      expandTimeout.current = null;
    }
    collapseTimeout.current = setTimeout(() => {
      setIsExpanded(false);
      setShowSettings(false);
      setIsAdding(false);
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

  const handleCancelAdd = () => {
    setNewStackName("");
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirmAdd();
    if (e.key === "Escape") handleCancelAdd();
  };

  if (!isLoaded) return null;

  return (
    <div
      className={`sidebar ${isExpanded ? "sidebar--expanded" : "sidebar--collapsed"} sidebar--${side}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Collapsed state: vertical text */}
      {!isExpanded && (
        <div className="sidebar-label">
          {"SideDockNest".split("").map((char, i) => (
            <span key={i} className="sidebar-label-char">
              {char}
            </span>
          ))}
        </div>
      )}

      {/* Expanded state: stacks and controls */}
      {isExpanded && (
        <div className="sidebar-content">
          <div className="sidebar-header">
            <span className="sidebar-title">SideDockNest</span>
          </div>

          <div className="sidebar-stacks">
            {stacks.map((stack) => (
              <Stack key={stack.id} stack={stack} />
            ))}
          </div>

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
                  onKeyDown={handleKeyDown}
                  onBlur={handleConfirmAdd}
                  maxLength={30}
                />
              </div>
            ) : showSettings ? (
              <div className="settings-controls">
                <button 
                  className={`settings-icon-btn ${autoStart ? 'settings-icon-btn--active' : ''}`}
                  onClick={handleToggleAutoStart} 
                  title={autoStart ? "Disable Auto-start" : "Enable Auto-start"}
                >
                  <Zap size={14} />
                </button>
                <div className="divider-v" />
                <button 
                  className="settings-icon-btn" 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                <button 
                  className="settings-icon-btn" 
                  onClick={() => setSide(side === 'left' ? 'right' : 'left')} 
                  title={`Move to ${side === 'left' ? 'right' : 'left'}`}
                >
                  {side === "left" ? <AlignRight size={14} /> : <AlignLeft size={14} />}
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
    </div>
  );
};
