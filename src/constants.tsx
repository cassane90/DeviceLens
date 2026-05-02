
import React from 'react';

export const API_KEYS = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

export const formatCurrency = (amount: string | number | undefined, code: string = 'USD'): string => {
  if (!amount) return '—';
  const value = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : amount;
  if (isNaN(value)) return String(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 0,
  }).format(value);
};

export const Icons = {
  Scan:       ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>document_scanner</span>,
  History:    ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>history</span>,
  Profile:    ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>manage_accounts</span>,
  Camera:     ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>photo_camera</span>,
  Upload:     ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>upload_file</span>,
  Check:      ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>check_circle</span>,
  X:          ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>close</span>,
  Warning:    ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>warning</span>,
  Info:       ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>info</span>,
  ArrowBack:  ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>arrow_back</span>,
  ArrowRight: ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>chevron_right</span>,
  Download:   ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>download</span>,
  Copy:       ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>content_copy</span>,
  Map:        ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>location_on</span>,
  Build:      ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>build</span>,
  Cart:       ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>shopping_cart</span>,
  Star:       ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>star</span>,
  Lock:       ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>lock</span>,
  Bolt:       ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>bolt</span>,
  Sun:        ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>light_mode</span>,
  Moon:       ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>dark_mode</span>,
  Logout:     ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>logout</span>,
  Devices:    ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className}`}>devices</span>,
};
