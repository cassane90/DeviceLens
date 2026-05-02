import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  onDismiss: () => void;
  autoDismissMs?: number;
}

const ToastNotification: React.FC<ToastProps> = ({ message, type = 'error', onDismiss, autoDismissMs }) => {
  useEffect(() => {
    if (!autoDismissMs) return;
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  const cfg = {
    error:   { icon: 'error',         light: 'bg-red-50   border-red-200   text-red-700',  dark: 'dark:bg-danger-d/10  dark:border-danger-d/25  dark:text-danger-d'  },
    warning: { icon: 'warning',        light: 'bg-amber-50 border-amber-200 text-amber-700', dark: 'dark:bg-warning-d/10 dark:border-warning-d/25 dark:text-warning-d' },
    info:    { icon: 'info',           light: 'bg-blue-50  border-blue-200  text-blue-700',  dark: 'dark:bg-accent/10    dark:border-accent/25    dark:text-accent'    },
    success: { icon: 'check_circle',   light: 'bg-green-50 border-green-200 text-green-700', dark: 'dark:bg-success-d/10 dark:border-success-d/25 dark:text-success-d' },
  }[type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 p-3.5 rounded-xl border ${cfg.light} ${cfg.dark} animate-in fade-in slide-in-from-top-2 duration-200`}
    >
      <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">{cfg.icon}</span>
      <p className="text-sm font-medium flex-1 leading-snug">{message}</p>
      <button onClick={onDismiss} aria-label="Dismiss" className="material-symbols-outlined text-base opacity-50 hover:opacity-100 transition-opacity shrink-0">
        close
      </button>
    </div>
  );
};

export default ToastNotification;
