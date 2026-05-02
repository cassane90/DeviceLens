
import React from 'react';
import { useApp } from '../providers/AppProvider';
import { QueryRecord, RiskLevel } from '../types';

interface HistoryListProps {
  onSelect: (record: QueryRecord) => void;
}

function riskClass(level: RiskLevel | string): string {
  switch (level) {
    case RiskLevel.LOW:      return 'risk-low';
    case RiskLevel.MODERATE: return 'risk-moderate';
    case RiskLevel.HIGH:     return 'risk-high';
    case RiskLevel.EXTREME:  return 'risk-extreme';
    default:                  return 'risk-moderate';
  }
}

const HistoryList: React.FC<HistoryListProps> = ({ onSelect }) => {
  const { history } = useApp();

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-dl-dark-s2 flex items-center justify-center">
          <span className="material-symbols-outlined text-gray-400 dark:text-dl-dt2 text-3xl">devices</span>
        </div>
        <div>
          <p className="font-semibold text-gray-700 dark:text-dl-dt">No scans yet</p>
          <p className="text-sm text-gray-400 dark:text-dl-dt2 mt-1">Tap "Start New Scan" to diagnose a device.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-400 dark:text-dl-dt2 uppercase tracking-wider px-1 mb-3">
        {history.length} scan{history.length !== 1 ? 's' : ''}
      </p>

      {/*
        Light: white card with shadow, rounded
        Dark:  dark surface row with left accent border
      */}
      {history.map(record => (
        <div
          key={record.id}
          onClick={() => onSelect(record)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onSelect(record)}
          className="
            group cursor-pointer
            bg-white dark:bg-dl-dark-s
            rounded-xl dark:rounded-lg
            shadow-soft dark:shadow-none
            border border-gray-100 dark:border-l-2 dark:border-dl-dark-b dark:border-l-accent/40
            hover:shadow-card dark:hover:bg-dl-dark-s2
            p-4 flex items-center gap-4
            transition-all duration-150
            active:scale-[0.99]
          "
        >
          {/* Device icon */}
          <div className="w-10 h-10 rounded-lg bg-primary/8 dark:bg-accent/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary dark:text-accent text-xl">
              {record.category === 'Smartphone' ? 'smartphone'
                : record.category === 'Laptop' ? 'laptop'
                : record.category === 'Tablet' ? 'tablet'
                : record.category === 'Game Console' ? 'sports_esports'
                : 'devices'}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-dl-dt text-sm truncate group-hover:text-primary dark:group-hover:text-accent transition-colors">
              {record.ai_response.brand} {record.ai_response.model}
            </p>
            <p className="text-xs text-gray-400 dark:text-dl-dt2 mt-0.5 truncate">
              {record.category} · {new Date(record.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Risk badge */}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${riskClass(record.ai_response.risk_level)}`}>
            {record.ai_response.risk_level}
          </span>

          <span className="material-symbols-outlined text-gray-300 dark:text-dl-dt2 text-xl shrink-0 group-hover:text-primary dark:group-hover:text-accent transition-colors">
            chevron_right
          </span>
        </div>
      ))}
    </div>
  );
};

export default HistoryList;
