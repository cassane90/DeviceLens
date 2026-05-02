
import React, { useState } from 'react';
import { UserRole } from '../types';
import { useApp } from '../providers/AppProvider';

const ROLE_META: Record<UserRole, { icon: string; description: string }> = {
  [UserRole.TECH]:    { icon: 'engineering',       description: 'Repair professionals & technicians' },
  [UserRole.AUDITOR]: { icon: 'business_center',   description: 'Business owners tracking device assets' },
  [UserRole.OPERATOR]:{ icon: 'home',              description: 'Personal device troubleshooting' },
  [UserRole.FLIPPER]: { icon: 'swap_horiz',        description: 'Buying & reselling refurbished devices' },
  [UserRole.DIY]:     { icon: 'build',             description: 'Self-repair enthusiasts' },
};

const Onboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { updateUser, refreshState } = useApp();
  const [role, setRole] = useState<UserRole | null>(null);
  const [saving, setSaving] = useState(false);

  const handleStart = async () => {
    if (!role) return;
    setSaving(true);
    await updateUser({ role, onboarding_accepted: true });
    await refreshState();
    onComplete();
  };

  return (
    <div className="min-h-screen bg-dl-bg dark:bg-dl-dark flex flex-col justify-center p-6 max-w-md mx-auto">

      {/* Header */}
      <div className="mb-8 space-y-2">
        <div className="w-12 h-12 bg-primary/10 dark:bg-accent/10 rounded-xl flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-primary dark:text-accent text-2xl">waving_hand</span>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-dl-dt tracking-tight">
          Welcome to DeviceLens
        </h2>
        <p className="text-sm text-gray-500 dark:text-dl-dt2">
          How will you mostly use this app? This helps us tailor your experience.
        </p>
      </div>

      {/* Role options */}
      <div className="space-y-2 mb-8">
        {(Object.values(UserRole) as UserRole[]).map(r => {
          const meta = ROLE_META[r];
          const selected = role === r;
          return (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all
                ${selected
                  ? 'bg-primary/5 dark:bg-accent/10 border-primary dark:border-accent shadow-soft dark:shadow-glow-sm'
                  : 'bg-white dark:bg-dl-dark-s border-gray-200 dark:border-dl-dark-b hover:border-primary/40 dark:hover:border-accent/30'
                }
              `}
            >
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                ${selected
                  ? 'bg-primary dark:bg-accent'
                  : 'bg-gray-100 dark:bg-dl-dark-s2'
                }
              `}>
                <span className={`material-symbols-outlined text-xl ${selected ? 'text-white dark:text-dl-dark' : 'text-gray-500 dark:text-dl-dt2'}`}>
                  {meta.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${selected ? 'text-primary dark:text-accent' : 'text-gray-900 dark:text-dl-dt'}`}>{r}</p>
                <p className="text-xs text-gray-500 dark:text-dl-dt2 mt-0.5">{meta.description}</p>
              </div>
              {selected && (
                <span className="material-symbols-outlined text-primary dark:text-accent text-xl shrink-0">check_circle</span>
              )}
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <button
        disabled={!role || saving}
        onClick={handleStart}
        className="
          w-full py-4 rounded-xl font-bold text-base text-white
          bg-primary hover:bg-primary-700 dark:bg-accent dark:text-dl-dark dark:hover:bg-blue-300
          shadow-card dark:shadow-glow
          disabled:opacity-40 disabled:cursor-not-allowed
          active:scale-[0.98] transition-all
        "
      >
        {saving ? 'Setting up…' : 'Get Started'}
      </button>
    </div>
  );
};

export default Onboarding;
