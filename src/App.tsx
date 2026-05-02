import React, { useState } from 'react';
import { AppProvider, useApp } from './providers/AppProvider';
import Onboarding from './components/Onboarding';
import Layout from './components/Layout';
import DiagnosticForm from './components/DiagnosticForm';
import ResultCard from './components/ResultCard';
import HistoryList from './components/HistoryList';
import ProfileView from './components/ProfileView';
import Login from './components/Login';
import PremiumModal from './components/PremiumModal';
import { QueryRecord } from './types';

export type AppView = 'home' | 'scan' | 'result' | 'profile';

const Main: React.FC = () => {
  const { isLoading, user, isAuthenticated, showPremiumModal, setShowPremiumModal } = useApp();
  const [view, setView] = useState<AppView>('home');
  const [selectedLog, setSelectedLog] = useState<QueryRecord | null>(null);

  if (isLoading) return (
    <div className="min-h-screen bg-dl-bg dark:bg-dl-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary dark:border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-500 dark:text-dl-dt2">Loading DeviceLens…</p>
      </div>
    </div>
  );

  if (!isAuthenticated) return <Login />;

  if (user && !user.onboarding_accepted) return <Onboarding onComplete={() => setView('home')} />;

  const handleInspect = (log: QueryRecord) => {
    setSelectedLog(log);
    setView('result');
  };

  return (
    <Layout currentView={view} onNavigate={(v) => setView(v as AppView)}>
      {view === 'home' && (
        <div className="page-enter p-5 pb-36 space-y-6">
          {/* Hero */}
          <div className="pt-2 space-y-1">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-dl-dt tracking-tight">
              Your Scans
            </h2>
            <p className="text-sm text-gray-500 dark:text-dl-dt2">
              Photograph a device to get an instant repair assessment.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={() => setView('scan')}
            className="w-full bg-primary hover:bg-primary-700 active:scale-[0.98] text-white rounded-xl py-4 font-bold text-base shadow-card dark:shadow-glow transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">document_scanner</span>
            Start New Scan
          </button>

          {/* History */}
          <HistoryList onSelect={handleInspect} />
        </div>
      )}

      {view === 'scan' && (
        <DiagnosticForm onSuccess={handleInspect} onCancel={() => setView('home')} />
      )}

      {view === 'result' && selectedLog && (
        <ResultCard record={selectedLog} onBack={() => setView('home')} />
      )}

      {view === 'profile' && <ProfileView />}

      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
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
