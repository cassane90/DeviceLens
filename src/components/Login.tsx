import React, { useState } from "react";
import { supabaseService } from "../services/supabaseService";
import { useApp } from "../providers/AppProvider";

const Login: React.FC = () => {
  const { continueAsGuest } = useApp();
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      await supabaseService.signIn();
    } catch {
      setError("Sign-in failed. You can still continue as a guest.");
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    setError(null);
    try {
      await continueAsGuest();
    } catch {
      setError("Guest mode could not start. Please refresh and try again.");
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-primary-600 dark:bg-dl-dark-s2 items-center justify-center p-12">
        <div className="text-white dark:text-dl-dt space-y-4 max-w-xs">
          <div className="w-14 h-14 bg-white/20 dark:bg-accent/20 rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-white dark:text-accent text-3xl">devices</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight">Know more before you repair.</h1>
          <p className="text-white/70 dark:text-dl-dt2 text-sm leading-relaxed">
            Add photos and symptoms to get an AI-assisted device assessment, rough repair estimates,
            and nearby repair options when location services are available.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-dl-bg dark:bg-dl-dark flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 dark:bg-accent/8 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 dark:bg-accent/10 rounded-2xl flex items-center justify-center shadow-card dark:shadow-glow">
              <span className="material-symbols-outlined text-primary dark:text-accent text-3xl">devices</span>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-dl-dt tracking-tight">DeviceLens</h1>
              <p className="text-sm text-gray-500 dark:text-dl-dt2 mt-1">Sign in to sync history, or use guest mode locally.</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-danger-d/10 border border-red-200 dark:border-danger-d/20">
              <span className="material-symbols-outlined text-danger dark:text-danger-d text-base">error</span>
              <p className="text-sm text-danger dark:text-danger-d font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleAuth}
              disabled={loading || guestLoading}
              className="w-full h-12 flex items-center justify-center gap-3 bg-white dark:bg-dl-dark-s2 border border-gray-200 dark:border-dl-dark-b rounded-xl shadow-soft hover:shadow-card dark:hover:border-accent/30 text-gray-800 dark:text-dl-dt font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-all duration-150"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-300 dark:border-dl-dark-b border-t-primary dark:border-t-accent rounded-full animate-spin" />
              ) : (
                <>
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" />
                  Continue with Google
                </>
              )}
            </button>

            <button
              onClick={handleGuest}
              disabled={loading || guestLoading}
              className="w-full h-12 flex items-center justify-center text-gray-500 dark:text-dl-dt2 text-sm font-medium hover:text-gray-700 dark:hover:text-dl-dt disabled:opacity-50 transition-colors"
            >
              {guestLoading ? "Starting guest mode..." : "Continue without signing in"}
            </button>
          </div>

          <p className="text-center text-[11px] text-gray-400 dark:text-dl-dt2 leading-relaxed">
            DeviceLens provides AI-assisted estimates, not a guaranteed diagnosis. Stop and seek professional help for swollen batteries, exposed mains power, or other hazardous hardware.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
