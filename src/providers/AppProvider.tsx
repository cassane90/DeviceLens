
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, QueryRecord, ThemeMode, UserRole } from '../types';
import { supabaseService, GUEST_PROFILE_KEY } from '../services/supabaseService';

interface AppContextType {
  user: UserProfile | null;
  history: QueryRecord[];
  isLoading: boolean;
  isAuthenticated: boolean;
  theme: ThemeMode;
  toggleTheme: () => void;
  refreshState: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  showPremiumModal: boolean;
  setShowPremiumModal: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_GUEST: UserProfile = {
  id: 'guest',
  email: 'guest@devicelens.app',
  role: UserRole.OPERATOR,
  is_premium: false,
  query_count: 0,
  onboarding_accepted: false,
  permissions: { camera: 'granted', location: 'granted' },
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<QueryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const refreshState = async () => {
    let u = await supabaseService.getProfile();
    if (!u) {
      const stored = localStorage.getItem(GUEST_PROFILE_KEY);
      u = stored ? JSON.parse(stored) : DEFAULT_GUEST;
    }
    const h = await supabaseService.getLogs();
    setUser(u);
    setHistory(h);
  };

  useEffect(() => {
    const init = async () => {
      const client = supabaseService.client;
      if (!client) {
        await refreshState();
        setIsLoading(false);
        return;
      }

      const session = await client.auth.getSession();
      setIsAuthenticated(!!session.data.session || !!localStorage.getItem(GUEST_PROFILE_KEY));

      await refreshState();

      client.auth.onAuthStateChange(async (_event, session) => {
        setIsAuthenticated(!!session || !!localStorage.getItem(GUEST_PROFILE_KEY));
        await refreshState();
      });

      setIsLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(newTheme);
  };

  const signOut = async () => {
    await supabaseService.signOut();
    localStorage.removeItem(GUEST_PROFILE_KEY);
    window.location.reload();
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    if (user?.id === 'guest') {
      const newProfile = { ...user, ...updates };
      setUser(newProfile);
      localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(newProfile));
    } else {
      await supabaseService.updateProfile(updates);
      await refreshState();
    }
  };

  return (
    <AppContext.Provider value={{
      user, history, isLoading, isAuthenticated, theme,
      toggleTheme, refreshState, signOut, updateUser,
      showPremiumModal, setShowPremiumModal,
    }}>
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
