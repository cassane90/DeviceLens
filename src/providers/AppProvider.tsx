import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { QueryRecord, ThemeMode } from "../types";
import { historyService } from "../services/historyService";

interface AppContextType {
  history: QueryRecord[];
  theme: ThemeMode;
  toggleTheme: () => void;
  saveHistory: (record: QueryRecord) => void;
  clearHistory: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function initialTheme(): ThemeMode {
  try {
    return localStorage.getItem("dl_theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<QueryRecord[]>(() => historyService.list());
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(theme);
    try {
      localStorage.setItem("dl_theme", theme);
    } catch {
      // Theme persistence is optional.
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(current => current === "dark" ? "light" : "dark");
  };

  const saveHistory = (record: QueryRecord) => {
    setHistory(historyService.save(record));
  };

  const clearHistory = () => {
    historyService.clear();
    setHistory([]);
  };

  const value = useMemo(() => ({
    history,
    theme,
    toggleTheme,
    saveHistory,
    clearHistory,
  }), [history, theme]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
