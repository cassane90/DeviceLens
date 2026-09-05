import React from "react";
import { useApp } from "../providers/AppProvider";

const SettingsView: React.FC = () => {
  const { theme, toggleTheme, history, clearHistory } = useApp();

  const handleClear = () => {
    if (history.length === 0) return;
    if (window.confirm("Clear all saved DeviceLens scan history on this device?")) {
      clearHistory();
    }
  };

  return (
    <div className="page-enter p-5 pb-36 space-y-5">
      <div className="pt-1">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-dl-dt tracking-tight">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-dl-dt2 mt-1">
          DeviceLens v1 keeps your scan history on this device.
        </p>
      </div>

      <section className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b overflow-hidden">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 p-4 border-b border-gray-100 dark:border-dl-dark-b hover:bg-gray-50 dark:hover:bg-dl-dark-s2 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-dl-dark-s2 flex items-center justify-center">
            <span className="material-symbols-outlined text-gray-600 dark:text-dl-dt2">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-dl-dt">
              Switch to {theme === "dark" ? "light" : "dark"} mode
            </p>
            <p className="text-xs text-gray-400 dark:text-dl-dt2">Currently {theme}</p>
          </div>
          <span className="material-symbols-outlined text-gray-300 dark:text-dl-dt2">chevron_right</span>
        </button>

        <button
          onClick={handleClear}
          disabled={history.length === 0}
          className="w-full flex items-center gap-3 p-4 hover:bg-red-50 dark:hover:bg-danger-d/5 disabled:opacity-40 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-danger-d/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-danger dark:text-danger-d">delete</span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-danger dark:text-danger-d">Clear scan history</p>
            <p className="text-xs text-gray-400 dark:text-dl-dt2">{history.length} saved scan{history.length === 1 ? "" : "s"}</p>
          </div>
        </button>
      </section>

      <section className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary dark:text-accent">privacy_tip</span>
          <h3 className="font-bold text-gray-900 dark:text-dl-dt">How v1 works</h3>
        </div>
        <ul className="space-y-2 text-sm text-gray-500 dark:text-dl-dt2 leading-relaxed">
          <li>Photos are sent to the DeviceLens diagnosis endpoint for analysis.</li>
          <li>Saved history stays in your browser and does not keep the uploaded photos.</li>
          <li>Repair-guide links come from iFixit when a matching guide is available.</li>
          <li>YouTube and nearby-repair buttons open external searches instead of pretending DeviceLens verified those results.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-amber-200 dark:border-warning-d/20 bg-amber-50 dark:bg-warning-d/10 p-4">
        <p className="text-xs text-amber-800 dark:text-warning-d leading-relaxed">
          DeviceLens is an AI-assisted triage tool, not a replacement for a qualified technician. Stop using or opening hardware that is swollen, burning, wet, connected to mains power, or otherwise unsafe.
        </p>
      </section>
    </div>
  );
};

export default SettingsView;
