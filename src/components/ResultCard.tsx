import React, { useState } from "react";
import { QueryRecord, RiskLevel } from "../types";

interface ResultCardProps {
  record: QueryRecord;
  onBack: () => void;
}

function riskClass(level: RiskLevel | string): string {
  switch (level) {
    case RiskLevel.LOW: return "risk-low";
    case RiskLevel.MODERATE: return "risk-moderate";
    case RiskLevel.HIGH: return "risk-high";
    case RiskLevel.EXTREME: return "risk-extreme";
    default: return "risk-moderate";
  }
}

function searchLinks(record: QueryRecord) {
  const result = record.ai_response;
  const device = [result.brand, result.model].filter(Boolean).join(" ").trim();
  const issue = record.description || result.likely_causes?.[0]?.cause || "repair";

  return {
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${device} ${issue} repair`)}`,
    maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${device} repair shop near me`)}`,
    market: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(device)}&LH_Sold=1&LH_Complete=1`,
    web: `https://www.google.com/search?q=${encodeURIComponent(`${device} ${issue} repair`)}`,
  };
}

const ResultCard: React.FC<ResultCardProps> = ({ record, onBack }) => {
  const result = record.ai_response;
  const links = searchLinks(record);
  const [copied, setCopied] = useState(false);

  const copySummary = async () => {
    const likely = result.likely_causes.map(item => `- ${item.cause} (${item.likelihood}): ${item.reason}`).join("\n");
    const text = [
      `DeviceLens assessment: ${result.brand} ${result.model}`,
      `Confidence: ${result.confidence_score}%`,
      `Risk: ${result.risk_level}`,
      "",
      result.summary,
      "",
      "Likely causes:",
      likely,
      "",
      `Recommended next step: ${result.recommended_action}`,
      `Repair difficulty: ${result.repair_difficulty}`,
      `Rough repair cost: ${result.potential_fix_cost_estimate}`,
      "",
      "AI-assisted assessment. Verify before repair or purchase decisions.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard support is optional.
    }
  };

  return (
    <div className="bg-dl-bg dark:bg-dl-dark min-h-screen text-gray-900 dark:text-dl-dt pb-36">
      <header className="sticky top-[61px] z-40 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-dl-dark-s/90 backdrop-blur-md border-b border-gray-100 dark:border-dl-dark-b">
        <button onClick={onBack} className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-dl-dark-s2">
          <span className="material-symbols-outlined text-gray-600 dark:text-dl-dt2 text-xl">arrow_back</span>
        </button>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-dl-dt2">Assessment</h2>
        <button onClick={copySummary} className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-dl-dark-s2" title="Copy summary">
          <span className="material-symbols-outlined text-gray-600 dark:text-dl-dt2 text-xl">{copied ? "check" : "content_copy"}</span>
        </button>
      </header>

      <main className="p-5 space-y-5">
        {(result.is_high_voltage || result.risk_level === RiskLevel.EXTREME) && (
          <section className="rounded-2xl border border-red-300 dark:border-danger-d/30 bg-red-50 dark:bg-danger-d/10 p-4">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-danger dark:text-danger-d">dangerous</span>
              <div>
                <p className="font-bold text-danger dark:text-danger-d">Stop before attempting DIY repair</p>
                <p className="text-sm text-red-700 dark:text-danger-d/90 mt-1">
                  This assessment indicates a potentially dangerous electrical, battery, or hardware risk.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b shadow-soft dark:shadow-none p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-400 dark:text-dl-dt2">{result.identified_category}</p>
              <h1 className="text-2xl font-extrabold tracking-tight mt-1">
                {result.brand} <span className="text-primary dark:text-accent">{result.model}</span>
              </h1>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border shrink-0 ${riskClass(result.risk_level)}`}>
              {result.risk_level} risk
            </span>
          </div>

          <div className="rounded-xl bg-gray-50 dark:bg-dl-dark-s2 p-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-gray-600 dark:text-dl-dt2">Identification confidence</span>
              <span className="font-mono font-bold text-gray-900 dark:text-dl-dt">{Math.round(result.confidence_score)}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-dl-dark-b overflow-hidden">
              <div className="h-full bg-primary dark:bg-accent rounded-full" style={{ width: `${Math.max(2, Math.min(100, result.confidence_score))}%` }} />
            </div>
          </div>

          {result.identification_evidence.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-dl-dt2 mb-2">What it used</p>
              <ul className="space-y-1.5">
                {result.identification_evidence.map((evidence, index) => (
                  <li key={index} className="flex gap-2 text-sm text-gray-600 dark:text-dl-dt2">
                    <span className="material-symbols-outlined text-primary dark:text-accent text-base mt-0.5">visibility</span>
                    <span>{evidence}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {result.no_visible_issue && (
          <section className="rounded-2xl border border-amber-200 dark:border-warning-d/20 bg-amber-50 dark:bg-warning-d/10 p-4">
            <p className="font-semibold text-warning dark:text-warning-d">No clear visible fault detected</p>
            <p className="text-sm text-amber-800 dark:text-warning-d/90 mt-1">
              A device can still have an internal or intermittent problem. Add detailed symptoms before relying on the visual assessment.
            </p>
          </section>
        )}

        <section className="bg-primary dark:bg-dl-dark-s2 rounded-2xl p-5 border border-primary/20 dark:border-accent/20">
          <p className="text-xs font-bold text-white/70 dark:text-accent uppercase tracking-wider">Assessment</p>
          <p className="text-lg font-bold text-white dark:text-dl-dt leading-relaxed mt-2">{result.summary}</p>
        </section>

        <section className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-dl-dark-b">
            <h3 className="font-bold text-sm">Likely causes</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-dl-dark-b">
            {result.likely_causes.map((item, index) => (
              <div key={index} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-sm">{item.cause}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-accent">{item.likelihood}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-dl-dt2 mt-1 leading-relaxed">{item.reason}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b p-4">
            <span className="material-symbols-outlined text-primary dark:text-accent">construction</span>
            <p className="text-xs text-gray-400 dark:text-dl-dt2 mt-2">Repair difficulty</p>
            <p className="font-bold text-sm mt-1">{result.repair_difficulty}</p>
          </div>
          <div className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b p-4">
            <span className="material-symbols-outlined text-primary dark:text-accent">payments</span>
            <p className="text-xs text-gray-400 dark:text-dl-dt2 mt-2">Rough repair cost</p>
            <p className="font-bold text-sm mt-1">{result.potential_fix_cost_estimate || "Unknown"}</p>
          </div>
        </section>

        <section className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-primary dark:text-accent">Recommended next step</p>
          <p className="text-lg font-extrabold mt-2 leading-snug">{result.recommended_action}</p>
          {result.cost_basis && (
            <p className="text-xs text-gray-400 dark:text-dl-dt2 mt-3 leading-relaxed">
              Cost estimate basis: {result.cost_basis}
            </p>
          )}
        </section>

        {result.safety_notes.length > 0 && (
          <section className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-dl-dark-b flex items-center gap-2">
              <span className="material-symbols-outlined text-warning dark:text-warning-d">health_and_safety</span>
              <h3 className="font-bold text-sm">Safety</h3>
            </div>
            <ul className="p-4 space-y-2">
              {result.safety_notes.map((note, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-dl-dt2 leading-relaxed flex gap-2">
                  <span className="text-warning dark:text-warning-d">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {result.required_tools.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-accent">handyman</span>
              Likely tools
            </h3>
            <div className="space-y-2">
              {result.required_tools.map((tool, index) => (
                <div key={index} className="bg-white dark:bg-dl-dark-s rounded-xl border border-gray-100 dark:border-dl-dark-b p-3.5">
                  <p className="font-semibold text-sm">{tool.name}</p>
                  <p className="text-xs text-gray-500 dark:text-dl-dt2 mt-1">{tool.reason}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {result.common_failures.length > 0 && (
          <section className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b p-4">
            <h3 className="font-bold text-sm mb-3">Common failure points worth checking</h3>
            <ul className="space-y-2">
              {result.common_failures.map((failure, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-dl-dt2 flex gap-2">
                  <span className="material-symbols-outlined text-gray-400 text-base">check_circle</span>
                  <span>{failure}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <div>
            <h3 className="font-bold text-sm">Repair resources</h3>
            <p className="text-xs text-gray-400 dark:text-dl-dt2 mt-1">External resources are searches or source guides, not DeviceLens endorsements.</p>
          </div>

          {result.repair_guides.length > 0 && (
            <div className="space-y-2">
              {result.repair_guides.map((guide, index) => (
                <a
                  key={index}
                  href={guide.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white dark:bg-dl-dark-s rounded-xl border border-gray-100 dark:border-dl-dark-b p-4 hover:border-primary/40 dark:hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-accent">{guide.source}</p>
                      <p className="font-semibold text-sm mt-1">{guide.title}</p>
                      {guide.summary && <p className="text-xs text-gray-500 dark:text-dl-dt2 mt-1 line-clamp-2">{guide.summary}</p>}
                    </div>
                    <span className="material-symbols-outlined text-gray-400">open_in_new</span>
                  </div>
                </a>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <a href={links.youtube} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white dark:bg-dl-dark-s border border-gray-100 dark:border-dl-dark-b p-4 flex flex-col gap-2">
              <span className="material-symbols-outlined text-red-500">play_circle</span>
              <span className="font-semibold text-sm">Search YouTube</span>
              <span className="text-[10px] text-gray-400 dark:text-dl-dt2">Exact device + repair</span>
            </a>
            <a href={links.maps} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white dark:bg-dl-dark-s border border-gray-100 dark:border-dl-dark-b p-4 flex flex-col gap-2">
              <span className="material-symbols-outlined text-primary dark:text-accent">location_on</span>
              <span className="font-semibold text-sm">Repair shops</span>
              <span className="text-[10px] text-gray-400 dark:text-dl-dt2">Open Google Maps search</span>
            </a>
            <a href={links.web} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white dark:bg-dl-dark-s border border-gray-100 dark:border-dl-dark-b p-4 flex flex-col gap-2">
              <span className="material-symbols-outlined text-primary dark:text-accent">search</span>
              <span className="font-semibold text-sm">Research repair</span>
              <span className="text-[10px] text-gray-400 dark:text-dl-dt2">Search the exact issue</span>
            </a>
            <a href={links.market} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white dark:bg-dl-dark-s border border-gray-100 dark:border-dl-dark-b p-4 flex flex-col gap-2">
              <span className="material-symbols-outlined text-primary dark:text-accent">sell</span>
              <span className="font-semibold text-sm">Check market</span>
              <span className="text-[10px] text-gray-400 dark:text-dl-dt2">Completed eBay listings</span>
            </a>
          </div>
        </section>

        <section className="rounded-xl bg-gray-100 dark:bg-dl-dark-s2 p-4">
          <p className="text-[11px] text-gray-500 dark:text-dl-dt2 leading-relaxed">
            DeviceLens provides AI-assisted triage and rough estimates. Photos cannot prove every internal fault, and prices vary by location, parts quality, model variant, and technician. Verify important repair, safety, and purchasing decisions independently.
          </p>
        </section>
      </main>
    </div>
  );
};

export default ResultCard;
