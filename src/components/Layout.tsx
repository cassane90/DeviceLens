import React, { useEffect, useState } from "react";
import { useApp } from "../providers/AppProvider";
import { AppView } from "../App";

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const { theme, toggleTheme } = useApp();
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-dl-bg dark:bg-dl-dark flex flex-col max-w-md mx-auto transition-colors duration-300 relative">
      <header className="sticky top-0 z-[100] bg-white/85 dark:bg-dl-dark-s/85 backdrop-blur-lg border-b border-gray-100 dark:border-dl-dark-b px-5 py-3.5 flex items-center justify-between">
        <button onClick={() => onNavigate("home")} className="flex items-center gap-2.5 text-left">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-white text-lg">document_scanner</span>
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-gray-900 dark:text-dl-dt tracking-tight leading-none">DeviceLens</h1>
            <p className="text-[10px] text-gray-400 dark:text-dl-dt2 leading-none mt-1">AI-assisted triage</p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <div title={online ? "Internet connection available" : "Offline"} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-dl-dark-s2">
            <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-success dark:bg-success-d" : "bg-gray-400"}`} />
            <span className="text-[10px] font-semibold text-gray-500 dark:text-dl-dt2">{online ? "Online" : "Offline"}</span>
          </div>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-dl-dark-s2 dark:hover:bg-dl-dark-b dark:text-dl-dt2 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-[200] bg-white dark:bg-dl-dark-s border-t border-gray-100 dark:border-dl-dark-b shadow-elevated dark:shadow-none h-20 flex items-center justify-around px-2">
        <NavItem view="home" icon="home" label="Home" current={currentView as AppView} onNavigate={onNavigate} />
        <NavItem view="scan" icon="document_scanner" label="Scan" current={currentView as AppView} onNavigate={onNavigate} />
        <NavItem view="settings" icon="settings" label="Settings" current={currentView as AppView} onNavigate={onNavigate} />
      </nav>
    </div>
  );
};

interface NavItemProps {
  view: AppView;
  icon: string;
  label: string;
  current: AppView;
  onNavigate: (v: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ view, icon, label, current, onNavigate }) => {
  const active = current === view || (current === "result" && view === "home");

  return (
    <button onClick={() => onNavigate(view)} className="relative flex flex-col items-center gap-1 w-20 py-2" aria-current={active ? "page" : undefined}>
      <span className={`material-symbols-outlined text-2xl ${active ? "text-primary dark:text-accent" : "text-gray-400 dark:text-dl-dt2"}`}>
        {icon}
      </span>
      <span className={`text-[10px] font-semibold ${active ? "text-primary dark:text-accent" : "text-gray-400 dark:text-dl-dt2"}`}>
        {label}
      </span>
      {active && <span className="nav-active-dot" />}
    </button>
  );
};

export default Layout;
