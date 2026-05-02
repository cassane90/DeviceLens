
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
      <div className="w-full max-w-sm bg-white dark:bg-dl-dark-s rounded-3xl dark:rounded-2xl shadow-elevated overflow-hidden">

        {/* Header stripe */}
        <div className="bg-primary dark:bg-dl-dark-s2 p-6 text-white dark:text-dl-dt text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-white/20 dark:bg-accent/10 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-white dark:text-accent text-2xl">rocket_launch</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">DeviceLens Pro</h2>
          <p className="text-sm text-white/70 dark:text-dl-dt2">Unlock the full experience</p>
        </div>

        <div className="p-5 space-y-5">
          {/* Features */}
          <div className="space-y-3">
            {[
              { icon: 'picture_as_pdf', label: 'Unlimited PDF report exports' },
              { icon: 'biotech',        label: 'Component-level failure prediction' },
              { icon: 'cloud_sync',     label: 'Cloud history sync across devices' },
              { icon: 'verified',       label: 'Priority AI processing' },
            ].map(f => (
              <div key={f.icon} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary dark:text-accent text-base">{f.icon}</span>
                </div>
                <p className="text-sm font-medium text-gray-800 dark:text-dl-dt">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl border border-gray-200 dark:border-dl-dark-b text-center">
              <p className="text-xs text-gray-400 dark:text-dl-dt2 font-medium">Monthly</p>
              <p className="text-lg font-extrabold text-gray-900 dark:text-dl-dt mt-0.5">$9.99</p>
            </div>
            <div className="p-3 rounded-xl border-2 border-primary dark:border-accent bg-primary/5 dark:bg-accent/10 text-center relative">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary dark:bg-accent text-white dark:text-dl-dark text-[9px] font-bold px-2 py-0.5 rounded-full">Best value</span>
              <p className="text-xs text-primary dark:text-accent font-medium">Yearly</p>
              <p className="text-lg font-extrabold text-primary dark:text-accent mt-0.5">$89.99</p>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <button
              onClick={handleUpgrade}
              className="w-full py-3.5 rounded-xl bg-primary dark:bg-accent text-white dark:text-dl-dark font-bold text-sm shadow-card dark:shadow-glow hover:bg-primary-700 dark:hover:bg-blue-300 active:scale-[0.98] transition-all"
            >
              Start free trial
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm text-gray-400 dark:text-dl-dt2 hover:text-gray-600 dark:hover:text-dl-dt font-medium transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
