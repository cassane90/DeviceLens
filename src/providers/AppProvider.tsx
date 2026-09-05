import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { UserProfile, QueryRecord, ThemeMode, UserRole } from "../types";
import { supabaseService, GUEST_PROFILE_KEY } from "../services/supabaseService";

interface AppContextType {
  user: UserProfile | null;
  history: QueryRecord[];
  isLoading: boolean;
  isAuthenticated: boolean;
  theme: ThemeMode;
  toggleTheme: () => void;
  refreshState: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  showPremiumModal: boolean;
  setShowPremiumModal: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_GUEST: UserProfile = {
  id: "guest",
  email: "guest@devicelens.app",
  role: UserRole.OPERATOR,
  is_premium: false,
  query_count: 0,
  onboarding_accepted: false,
  permissions: { camera: "prompt", location: "prompt" },
};

function readGuest(): UserProfile | null {
  try {
    const stored = localStorage.getItem(GUEST_PROFILE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<QueryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const refreshState = async () => {
    const guest = readGuest();
    let profile = guest;

    if (!guest) {
      profile = await supabaseService.getProfile();
    }

    const logs = await supabaseService.getLogs();
    setUser(profile);
    setHistory(logs);
    setIsAuthenticated(Boolean(profile));
  };

  useEffect(() => {
    const init = async () => {
      await refreshState();

      const client = supabaseService.client;
      if (client) {
        client.auth.onAuthStateChange(async () => {
          await refreshState();
        });
      }

      setIsLoading(false);
    };

    init();
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(theme);
  }, [theme]);

  const continueAsGuest = async () => {
    const existing = readGuest();
    const guest = existing || DEFAULT_GUEST;
    localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(guest));
    setUser(guest);
    setIsAuthenticated(true);
    setHistory(await supabaseService.getLogs());
  };

  const toggleTheme = () => {
    setTheme(current => current === "dark" ? "light" : "dark");
  };

  const signOut = async () => {
    await supabaseService.signOut();
    localStorage.removeItem(GUEST_PROFILE_KEY);
    setUser(null);
    setHistory([]);
    setIsAuthenticated(false);
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    if (user?.id === "guest") {
      const next = { ...user, ...updates };
      setUser(next);
      localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(next));
      return;
    }

    await supabaseService.updateProfile(updates);
    await refreshState();
  };

  const value = useMemo(() => ({
    user,
    history,
    isLoading,
    isAuthenticated,
    theme,
    toggleTheme,
    refreshState,
    signOut,
    continueAsGuest,
    updateUser,
    showPremiumModal,
    setShowPremiumModal,
  }), [user, history, isLoading, isAuthenticated, theme, showPremiumModal]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
