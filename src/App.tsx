import React from "react";
import { Sidebar } from "./components/dock/Sidebar";
import { ToastContainer } from "./components/common/Toast";
import { useDockStore } from "./stores/dockStore";
import { useConfigStore } from "./stores/configStore";

const App: React.FC = () => {
  const loadDock = useDockStore((s) => s.loadFromStore);
  const loadConfig = useConfigStore((s) => s.loadConfig);
  const theme = useConfigStore((s) => s.theme);

  React.useEffect(() => {
    loadConfig();
    loadDock();
  }, [loadConfig, loadDock]);

  // Apply theme to document root to ensure CSS variables work globally
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="app-container">
      <Sidebar />
      <ToastContainer />
    </div>
  );
};

export default App;
