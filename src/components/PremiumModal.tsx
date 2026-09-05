import React from "react";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-dl-dark-s rounded-3xl shadow-elevated overflow-hidden">
        <div className="relative bg-gradient-to-br from-primary to-blue-700 dark:from-dl-dark-s2 dark:to-dl-dark-s p-6 text-center overflow-hidden">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-white text-3xl">construction</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">DeviceLens Pro</h2>
            <p className="text-sm text-white/70 mt-1">Planned, not for sale yet.</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-gray-600 dark:text-dl-dt2 leading-relaxed">
            The Pro plan is still being designed. DeviceLens will not charge you or unlock paid features until a real payment and entitlement system is connected.
          </p>

          <div className="space-y-3">
            {[
              "Higher daily scan allowance",
              "Additional reporting features",
              "Future advanced diagnostic tools",
            ].map(label => (
              <div key={label} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary dark:text-accent text-lg">check_circle</span>
                <p className="text-sm text-gray-800 dark:text-dl-dt">{label}</p>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-primary dark:bg-accent text-white dark:text-dl-dark font-bold text-sm shadow-card dark:shadow-glow active:scale-[0.98] transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
