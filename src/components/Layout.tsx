
import React from 'react';
import { useApp } from '../providers/AppProvider';
import { AppView } from '../App';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const { theme, toggleTheme } = useApp();

  return (
    <div className="min-h-screen bg-dl-bg dark:bg-dl-dark flex flex-col max-w-md mx-auto transition-colors duration-300 relative">

      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      {/* Light: white card with shadow │ Dark: dark surface with bottom accent line */}
      <header className="
        sticky top-0 z-[100]
        bg-white/80 dark:bg-dl-dark-s/80
        backdrop-blur-lg
        shadow-soft dark:shadow-none
        border-b border-gray-100/80 dark:border-dl-dark-b/80
        px-5 py-3.5 flex items-center justify-between
        transition-colors duration-300
      ">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-white text-lg">document_scanner</span>
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-gray-900 dark:text-dl-dt tracking-tight leading-none">DeviceLens</h1>
            <p className="text-[10px] text-gray-400 dark:text-dl-dt2 leading-none mt-0.5">AI Device Diagnostics</p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="
              w-9 h-9 rounded-lg flex items-center justify-center
              bg-gray-100 hover:bg-gray-200 text-gray-600
              dark:bg-dl-dark-s2 dark:hover:bg-dl-dark-b dark:text-dl-dt2
              transition-colors
            "
          >
            <span className="material-symbols-outlined text-lg">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Online indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-success-d/10 border border-green-100 dark:border-success-d/20">
            <span className="w-1.5 h-1.5 rounded-full bg-success dark:bg-success-d animate-pulse" />
            <span className="text-[10px] font-semibold text-success dark:text-success-d">Online</span>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>

      {/* ── BOTTOM NAV ─────────────────────────────────────────────────────────── */}
      {/*
        Light: white bar, rounded pill around active icon
        Dark:  dark bar, glowing underline on active icon
      */}
      <nav className="
        fixed bottom-0 left-0 right-0 max-w-md mx-auto z-[200]
        bg-white dark:bg-dl-dark-s
        border-t border-gray-100 dark:border-dl-dark-b
        shadow-elevated dark:shadow-none
        h-20 flex items-center justify-around px-2
        transition-colors duration-300
        pb-safe
      ">
        <NavItem view="home"    icon="home"              label="Home"    current={currentView as AppView} onNavigate={onNavigate} />
        <NavItem view="scan"    icon="document_scanner"  label="Scan"    current={currentView as AppView} onNavigate={onNavigate} />
        <NavItem view="profile" icon="manage_accounts"   label="Profile" current={currentView as AppView} onNavigate={onNavigate} />
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
  const active = current === view || (current === 'result' && view === 'home');

  return (
    <button
      onClick={() => onNavigate(view)}
      className="relative flex flex-col items-center gap-1 w-20 py-2 transition-all"
      aria-current={active ? 'page' : undefined}
    >
      {/* Light mode: pill background on active */}
      {active && <span className="nav-pill hidden dark:hidden" style={{ display: 'block' }} />}

      <span className={`
        material-symbols-outlined text-2xl relative z-10 transition-colors
        ${active
          ? 'text-primary dark:text-accent'
          : 'text-gray-400 dark:text-dl-dt2 hover:text-gray-600 dark:hover:text-dl-dt'
        }
      `}>
        {icon}
      </span>

      <span className={`
        text-[10px] font-semibold relative z-10 transition-colors
        ${active
          ? 'text-primary dark:text-accent'
          : 'text-gray-400 dark:text-dl-dt2'
        }
      `}>
        {label}
      </span>

      {/* Dark mode: glowing underline */}
      {active && <span className="nav-active-dot" />}
    </button>
  );
};

export default Layout;
