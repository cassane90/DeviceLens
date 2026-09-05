
import React from 'react';
import { useApp } from '../providers/AppProvider';

const ProfileView: React.FC = () => {
  const { user, toggleTheme, theme, signOut, setShowPremiumModal } = useApp();

  const username = user?.email?.split('@')[0] || 'User';

  return (
    <div className="page-enter p-5 pb-36 space-y-5">

      {/* ── User card ── */}
      <div className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b shadow-soft dark:shadow-none p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-accent/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary dark:text-accent text-3xl">account_circle</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900 dark:text-dl-dt truncate">{username}</p>
            {user?.is_premium && (
              <span className="bg-primary dark:bg-accent text-white dark:text-dl-dark text-[9px] font-bold px-2 py-0.5 rounded-full">PRO</span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-dl-dt2 mt-0.5">{user?.email}</p>
          <p className="text-xs text-primary dark:text-accent font-medium mt-0.5">{user?.role || 'Home User'}</p>
        </div>
      </div>

      {/* ── Pro upgrade banner (if not premium) ── */}
      {!user?.is_premium && (
        <button
          onClick={() => setShowPremiumModal(true)}
          className="w-full p-4 rounded-2xl bg-primary dark:bg-dl-dark-s2 border border-primary/20 dark:border-accent/20 flex items-center justify-between shadow-card dark:shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          <div className="text-left">
            <p className="text-xs text-white/70 dark:text-accent font-medium">DeviceLens Pro (planned)</p>
            <p className="font-bold text-white dark:text-dl-dt text-sm mt-0.5">See planned Pro features →</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 dark:bg-accent/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-white dark:text-accent text-xl">rocket_launch</span>
          </div>
        </button>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b shadow-soft dark:shadow-none p-4">
          <p className="text-xs text-gray-400 dark:text-dl-dt2 font-medium">Total scans</p>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-dl-dt mt-1">{user?.query_count || 0}</p>
        </div>
        <div className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b shadow-soft dark:shadow-none p-4">
          <p className="text-xs text-gray-400 dark:text-dl-dt2 font-medium">Mode</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-success dark:bg-success-d" />
            <p className="font-bold text-success dark:text-success-d">{user?.id === 'guest' ? 'Guest' : 'Signed in'}</p>
          </div>
        </div>
      </div>

      {/* ── Settings list ── */}
      <div className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b shadow-soft dark:shadow-none overflow-hidden">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 p-4 border-b border-gray-100 dark:border-dl-dark-b hover:bg-gray-50 dark:hover:bg-dl-dark-s2 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dl-dark-s2 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-gray-600 dark:text-dl-dt2 text-xl">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-dl-dt">
              Switch to {theme === 'dark' ? 'light' : 'dark'} mode
            </p>
            <p className="text-xs text-gray-400 dark:text-dl-dt2 mt-0.5">
              Currently in {theme} mode
            </p>
          </div>
          <span className="material-symbols-outlined text-gray-300 dark:text-dl-dt2">chevron_right</span>
        </button>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 p-4 hover:bg-red-50 dark:hover:bg-danger-d/5 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-danger-d/10 flex items-center justify-center shrink-0 group-hover:bg-red-100 dark:group-hover:bg-danger-d/20 transition-colors">
            <span className="material-symbols-outlined text-danger dark:text-danger-d text-xl">logout</span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-danger dark:text-danger-d">Sign out</p>
          </div>
        </button>
      </div>

      <p className="text-center text-[11px] text-gray-300 dark:text-dl-dt2/50">DeviceLens v1.0.0</p>
    </div>
  );
};

export default ProfileView;
