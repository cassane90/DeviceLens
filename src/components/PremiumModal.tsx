import React from 'react';
import { useApp } from '../providers/AppProvider';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose }) => {
  const { updateUser } = useApp();

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    await updateUser({ is_premium: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-dl-dark-s rounded-3xl shadow-elevated overflow-hidden">

        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary to-blue-700 dark:from-dl-dark-s2 dark:to-dl-dark-s p-6 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 70% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-white text-3xl">bolt</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">DeviceLens Pro</h2>
            <p className="text-sm text-white/70 mt-1">Pay once. Yours forever.</p>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* Main value prop */}
          <div className="p-4 rounded-2xl bg-primary/5 dark:bg-accent/10 border border-primary/20 dark:border-accent/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-accent/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary dark:text-accent">speed</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-dl-dt text-sm">250 scans per day</p>
                <p className="text-xs text-gray-500 dark:text-dl-dt2 mt-0.5">vs 20/day on free — 12× more headroom</p>
              </div>
            </div>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              { icon: 'priority_high', label: 'Priority analysis queue',       sub: 'Your scans go first when demand is high' },
              { icon: 'all_inclusive', label: 'No monthly fees, ever',          sub: 'One payment, lifetime access' },
              { icon: 'new_releases',  label: 'Early access to new features',  sub: 'Shape what gets built next' },
            ].map(f => (
              <div key={f.icon} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dl-dark-s2 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-primary dark:text-accent text-base">{f.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-dl-dt">{f.label}</p>
                  <p className="text-xs text-gray-400 dark:text-dl-dt2">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Price */}
          <div className="text-center py-2">
            <p className="text-4xl font-extrabold text-gray-900 dark:text-dl-dt">$14.99</p>
            <p className="text-sm text-gray-400 dark:text-dl-dt2 mt-1">one-time · no subscription · no renewal</p>
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <button
              onClick={handleUpgrade}
              className="w-full py-3.5 rounded-xl bg-primary dark:bg-accent text-white dark:text-dl-dark font-bold text-sm shadow-card dark:shadow-glow hover:bg-primary-700 dark:hover:bg-blue-300 active:scale-[0.98] transition-all"
            >
              Get Pro — $14.99
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm text-gray-400 dark:text-dl-dt2 hover:text-gray-600 dark:hover:text-dl-dt font-medium transition-colors"
            >
              Keep free plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
