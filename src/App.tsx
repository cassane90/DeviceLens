import React, { useState } from "react";
import { AppProvider } from "./providers/AppProvider";
import Layout from "./components/Layout";
import DiagnosticForm from "./components/DiagnosticForm";
import ResultCard from "./components/ResultCard";
import HistoryList from "./components/HistoryList";
import SettingsView from "./components/SettingsView";
import { QueryRecord } from "./types";

export type AppView = "home" | "scan" | "result" | "settings";

const Main: React.FC = () => {
  const [view, setView] = useState<AppView>("home");
  const [selectedLog, setSelectedLog] = useState<QueryRecord | null>(null);

  const handleInspect = (log: QueryRecord) => {
    setSelectedLog(log);
    setView("result");
  };

  return (
    <Layout currentView={view} onNavigate={v => setView(v as AppView)}>
      {view === "home" && (
        <div className="page-enter p-5 pb-36 space-y-6">
          <section className="pt-2 space-y-2">
            <p className="text-xs font-bold tracking-[0.18em] uppercase text-primary dark:text-accent">
              AI-assisted device triage
            </p>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-dl-dt tracking-tight">
              Figure out what to do next.
            </h2>
            <p className="text-sm text-gray-500 dark:text-dl-dt2 leading-relaxed max-w-sm">
              Add clear photos and symptoms. DeviceLens will assess the device, explain likely causes,
              flag safety risks, and point you toward repair resources.
            </p>
          </section>

          <button
            onClick={() => setView("scan")}
            className="w-full bg-primary hover:bg-primary-700 active:scale-[0.98] text-white rounded-xl py-4 font-bold text-base shadow-card dark:shadow-glow transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">document_scanner</span>
            Start a Device Scan
          </button>

          <section className="grid grid-cols-3 gap-2">
            {[
              ["photo_camera", "Photos"],
              ["health_and_safety", "Risk"],
              ["build", "Next steps"],
            ].map(([icon, label]) => (
              <div key={label} className="rounded-xl border border-gray-100 dark:border-dl-dark-b bg-white dark:bg-dl-dark-s p-3 text-center">
                <span className="material-symbols-outlined text-primary dark:text-accent text-xl">{icon}</span>
                <p className="text-[11px] font-semibold text-gray-600 dark:text-dl-dt2 mt-1">{label}</p>
              </div>
            ))}
          </section>

          <div>
            <div className="flex items-end justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-dl-dt">Previous scans</h3>
                <p className="text-xs text-gray-400 dark:text-dl-dt2">Saved only in this browser.</p>
              </div>
            </div>
            <HistoryList onSelect={handleInspect} />
          </div>
        </div>
      )}

      {view === "scan" && (
        <DiagnosticForm onSuccess={handleInspect} onCancel={() => setView("home")} />
      )}

      {view === "result" && selectedLog && (
        <ResultCard record={selectedLog} onBack={() => setView("home")} />
      )}

      {view === "settings" && <SettingsView />}
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
}
