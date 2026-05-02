import React from 'react';
import { QueryRecord, RiskLevel } from '../types';
import { formatCurrency } from '../constants';
import { useApp } from '../providers/AppProvider';

interface ResultCardProps {
  record: QueryRecord;
  onBack: () => void;
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

function riskIcon(level: RiskLevel | string): string {
  switch (level) {
    case RiskLevel.LOW:     return 'check_circle';
    case RiskLevel.MODERATE: return 'warning';
    case RiskLevel.HIGH:    return 'report';
    case RiskLevel.EXTREME: return 'dangerous';
    default:                return 'warning';
  }
}

const ResultCard: React.FC<ResultCardProps> = ({ record, onBack }) => {
  const {
    brand, model, confidence_score, risk_level, reasoning, recommended_action,
    resale_value, currency_code, recommended_repair_hubs, diy_guides, required_tools,
    purchase_options, parts_retailers, category_mismatch, identified_category,
    no_visible_issue, common_failures,
  } = record.ai_response;

  const { user, setShowPremiumModal } = useApp();

  const [diyOpen, setDiyOpen] = React.useState(false);
  const [diyConfirm, setDiyConfirm] = React.useState(false);
  const [jsonCopied, setJsonCopied] = React.useState(false);
  const repairHubsRef = React.useRef<HTMLDivElement>(null);

  const exportReport = async () => {
    if (!user?.is_premium) { setShowPremiumModal(true); return; }
    const el = document.getElementById('report-export');
    if (!el) return;
    // Lazy-load heavy PDF libs only when actually needed (~200 KB saved on initial load)
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
    pdf.save(`DeviceLens_${model.replace(/\s+/g, '_')}.pdf`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(record.ai_response, null, 2));
    } catch {
      const el = document.createElement('textarea');
      el.value = JSON.stringify(record.ai_response, null, 2);
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    }
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  return (
    <div className="bg-dl-bg dark:bg-dl-dark min-h-screen text-gray-900 dark:text-dl-dt pb-36 transition-colors duration-300">

      {/* Sticky header */}
      <header
        data-html2canvas-ignore
        className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-dl-dark-s/90 backdrop-blur-md border-b border-gray-100 dark:border-dl-dark-b"
      >
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-dl-dark-s2 hover:bg-gray-200 dark:hover:bg-dl-dark-b transition-colors"
        >
          <span className="material-symbols-outlined text-gray-600 dark:text-dl-dt2 text-xl">arrow_back</span>
        </button>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-dl-dt2">Diagnosis Result</h2>
        <div className="w-9" />
      </header>

      {/* Exportable content */}
      <main id="report-export" className="p-5 space-y-5 bg-dl-bg dark:bg-dl-dark">

        {/* ── Category mismatch ── */}
        {category_mismatch && (
          <div className="flex gap-3 p-3.5 rounded-xl bg-blue-50 dark:bg-accent/10 border border-blue-200 dark:border-accent/20">
            <span className="material-symbols-outlined text-primary dark:text-accent text-xl shrink-0">info</span>
            <div>
              <p className="font-semibold text-sm text-primary dark:text-accent">Category mismatch detected</p>
              <p className="text-xs text-blue-600 dark:text-dl-dt2 mt-0.5">
                You selected <strong>{record.category}</strong>, but we identified this as a <strong>{identified_category}</strong>. Tip: select the correct category next time for better results.
              </p>
            </div>
          </div>
        )}

        {/* ── No visible issue ── */}
        {no_visible_issue && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-warning-d/10 border border-amber-200 dark:border-warning-d/20 space-y-3">
            <div className="flex gap-3 items-start">
              <span className="material-symbols-outlined text-warning dark:text-warning-d text-xl shrink-0">help</span>
              <div>
                <p className="font-semibold text-sm text-warning dark:text-warning-d">No obvious damage found</p>
                <p className="text-xs text-amber-700 dark:text-warning-d/80 mt-0.5">
                  This device looks in good condition. To get a useful diagnosis, please describe the specific issue you're experiencing.
                </p>
              </div>
            </div>
            <button
              data-html2canvas-ignore
              onClick={onBack}
              className="w-full py-2.5 rounded-lg bg-warning dark:bg-warning-d text-white dark:text-dl-dark font-semibold text-sm transition-colors"
            >
              Add description
            </button>
          </div>
        )}

        {/* ── Device identity ── */}
        <section className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b shadow-soft dark:shadow-none p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-dl-dt tracking-tight leading-tight">
                {brand} <span className="text-primary dark:text-accent">{model}</span>
              </h1>
              <p className="text-sm text-gray-400 dark:text-dl-dt2 mt-1">{Math.round(confidence_score)}% confidence match</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1 shrink-0 ${riskClass(risk_level)}`}>
              <span className="material-symbols-outlined text-xs">{riskIcon(risk_level)}</span>
              {risk_level} risk
            </span>
          </div>

          {/* Tech specs (if from DB) */}
          {record.ai_response.technical_specs && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-dl-dark-b">
              {Object.entries(record.ai_response.technical_specs).map(([key, value]) => (
                <div key={key}>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-dl-dt2 uppercase tracking-wide">{key}</p>
                  <p className="text-xs font-semibold text-gray-900 dark:text-dl-dt font-mono mt-0.5">{String(value)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Common failures (premium) ── */}
        {common_failures && common_failures.length > 0 && (
          <section className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b shadow-soft dark:shadow-none overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-dl-dark-b flex items-center gap-2">
              <span className="material-symbols-outlined text-warning dark:text-warning-d text-base">warning</span>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-dl-dt">Known failure points</h3>
            </div>
            <div className="p-4 relative">
              <ul className={`space-y-2 ${!user?.is_premium ? 'blur-sm select-none' : ''}`}>
                {common_failures.map((fail, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning dark:bg-warning-d mt-1.5 shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-dl-dt">{fail}</p>
                  </li>
                ))}
              </ul>
              {!user?.is_premium && (
                <button
                  onClick={() => setShowPremiumModal(true)}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/50 dark:bg-dl-dark-s/50 backdrop-blur-[3px] hover:bg-white/40 dark:hover:bg-dl-dark-s/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-primary dark:text-accent text-2xl">lock</span>
                  <p className="text-xs font-semibold text-primary dark:text-accent">Unlock with Pro</p>
                </button>
              )}
            </div>
          </section>
        )}

        {/* ── Value breakdown ── */}
        <section className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b shadow-soft dark:shadow-none overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-dl-dark-b flex items-center gap-2">
            <span className="material-symbols-outlined text-primary dark:text-accent text-base">attach_money</span>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-dl-dt">Value breakdown</h3>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-dl-dark-b">
            <div className="p-4 text-center">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-dl-dt2 uppercase mb-1">As-is</p>
              <p className="font-bold text-gray-900 dark:text-dl-dt text-sm font-mono">{formatCurrency(resale_value.unit_value_broken, currency_code)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-dl-dt2 uppercase mb-1">Repaired</p>
              <p className="font-bold text-gray-900 dark:text-dl-dt text-sm font-mono">{formatCurrency(resale_value.unit_value_fixed, currency_code)}</p>
            </div>
            <div className="p-4 text-center bg-green-50 dark:bg-success-d/10">
              <p className="text-[10px] font-semibold text-success dark:text-success-d uppercase mb-1">Profit</p>
              <p className="font-bold text-success dark:text-success-d text-sm font-mono">{formatCurrency(resale_value.profit_potential, currency_code)}</p>
            </div>
          </div>
        </section>

        {/* ── Recommendation ── */}
        <section className="bg-primary dark:bg-dl-dark-s2 rounded-2xl p-5 border border-primary/20 dark:border-accent/20 space-y-2">
          <p className="text-xs font-semibold text-white/70 dark:text-accent uppercase tracking-wider">Our recommendation</p>
          <p className="text-xl font-extrabold text-white dark:text-dl-dt leading-tight">{recommended_action}</p>
          <p className="text-sm text-white/80 dark:text-dl-dt2 leading-relaxed">{reasoning}</p>
        </section>

        {/* ── Market options ── */}
        {((purchase_options?.length > 0) || (parts_retailers?.length > 0)) && (
          <section className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 dark:text-dl-dt flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-accent">shopping_cart</span>
              Where to buy
            </h3>

            {purchase_options?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 dark:text-dl-dt2 font-medium">Replacement units</p>
                {purchase_options.map((opt, i) => (
                  <a key={i} href={opt.uri} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-dl-dark-s border border-gray-100 dark:border-dl-dark-b hover:border-primary/30 dark:hover:border-accent/30 shadow-soft dark:shadow-none transition-all group"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-dl-dt group-hover:text-primary dark:group-hover:text-accent">{opt.name}</p>
                      <span className="text-[10px] text-gray-400 dark:text-dl-dt2">{opt.is_new ? 'Brand new' : 'Used / Refurb'}</span>
                    </div>
                    <p className="font-bold text-primary dark:text-accent text-sm font-mono">{opt.price}</p>
                  </a>
                ))}
              </div>
            )}

            {parts_retailers?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 dark:text-dl-dt2 font-medium">Parts & components</p>
                {parts_retailers.map((part, i) => (
                  <a key={i} href={part.uri} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-dl-dark-s border border-gray-100 dark:border-dl-dark-b hover:border-success/30 dark:hover:border-success-d/30 shadow-soft dark:shadow-none transition-all group"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-dl-dt">{part.part_name}</p>
                      <span className="text-[10px] text-gray-400 dark:text-dl-dt2">via {part.name}</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 dark:text-dl-dt2 group-hover:text-success dark:group-hover:text-success-d">open_in_new</span>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Local repair shops ── */}
        <section ref={repairHubsRef} className="space-y-3">
          <h3 className="font-semibold text-sm text-gray-700 dark:text-dl-dt flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary dark:text-accent">location_on</span>
            Nearby repair shops
          </h3>
          <div className="space-y-2">
            {recommended_repair_hubs?.length > 0 ? (
              recommended_repair_hubs.map((hub, i) => (
                <a key={i} href={hub.uri} target="_blank" rel="noopener noreferrer"
                  className="block p-4 rounded-xl bg-white dark:bg-dl-dark-s border border-gray-100 dark:border-dl-dark-b hover:border-primary/30 dark:hover:border-accent/30 shadow-soft dark:shadow-none transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-sm text-gray-900 dark:text-dl-dt group-hover:text-primary dark:group-hover:text-accent">{hub.name}</p>
                    {hub.rating && (
                      <span className="flex items-center gap-1 text-xs text-warning dark:text-warning-d font-medium">
                        <span className="material-symbols-outlined text-xs">star</span>
                        {hub.rating}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-dl-dt2 mt-1 truncate">{hub.address}</p>
                </a>
              ))
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-gray-200 dark:border-dl-dark-b text-center space-y-2">
                <span className="material-symbols-outlined text-gray-300 dark:text-dl-dt2 text-2xl">location_off</span>
                <p className="text-sm text-gray-400 dark:text-dl-dt2">Location permission needed to find local shops.</p>
              </div>
            )}
          </div>
        </section>

        {/* ── DIY repair section ── */}
        <section className="space-y-3">
          <h3 className="font-semibold text-sm text-gray-700 dark:text-dl-dt flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary dark:text-accent">build</span>
            DIY repair guides
          </h3>

          {!diyOpen && !diyConfirm && (
            <div className="p-5 rounded-xl bg-white dark:bg-dl-dark-s border border-gray-100 dark:border-dl-dark-b shadow-soft dark:shadow-none space-y-4">
              <div className="flex gap-3 items-start">
                <span className="material-symbols-outlined text-warning dark:text-warning-d text-xl shrink-0">warning</span>
                <div>
                  <p className="font-semibold text-sm text-warning dark:text-warning-d">DIY carries real risk</p>
                  <p className="text-xs text-gray-500 dark:text-dl-dt2 mt-0.5 leading-relaxed">
                    Unauthorized repairs may void your warranty or cause further damage. Only proceed if you're confident.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDiyConfirm(true)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 dark:bg-dl-dark-s2 text-white dark:text-dl-dt text-sm font-semibold hover:opacity-90 transition-all"
                >
                  Show guides anyway
                </button>
                <button
                  onClick={() => repairHubsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dl-dark-b text-gray-700 dark:text-dl-dt text-sm font-semibold hover:bg-gray-50 dark:hover:bg-dl-dark-s2 transition-all"
                >
                  Find a shop instead
                </button>
              </div>
            </div>
          )}

          {diyConfirm && !diyOpen && (
            <div className="p-5 rounded-xl bg-amber-50 dark:bg-warning-d/10 border border-amber-200 dark:border-warning-d/20 space-y-4">
              <p className="font-semibold text-sm text-gray-900 dark:text-dl-dt text-center">Are you sure?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setDiyOpen(true); setDiyConfirm(false); }}
                  className="flex-1 py-2.5 rounded-xl bg-warning dark:bg-warning-d text-white dark:text-dl-dark font-semibold text-sm"
                >
                  Yes, I understand
                </button>
                <button
                  onClick={() => setDiyConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dl-dark-b text-gray-700 dark:text-dl-dt text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {diyOpen && (
            <div className="space-y-4">
              {/* Tools */}
              {required_tools && required_tools.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 dark:text-dl-dt2 font-medium">Tools needed</p>
                  {required_tools.map((tool, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-dl-dark-s border border-gray-100 dark:border-dl-dark-b shadow-soft dark:shadow-none">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-dl-dt">{tool.name}</p>
                        <p className="text-xs text-gray-400 dark:text-dl-dt2">{tool.reason}</p>
                      </div>
                      {tool.link && (
                        <a href={tool.link} target="_blank" rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 dark:bg-accent/10 hover:bg-primary/20 dark:hover:bg-accent/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-primary dark:text-accent text-base">shopping_cart</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Video guides */}
              {diy_guides && diy_guides.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 dark:text-dl-dt2 font-medium">Video guides</p>
                  {diy_guides.map((guide, i) => (
                    <a key={i} href={guide.uri} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-dl-dark-s border border-gray-100 dark:border-dl-dark-b hover:border-primary/30 dark:hover:border-accent/30 shadow-soft dark:shadow-none transition-all group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-danger-d/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-red-500 dark:text-danger-d text-xl">play_circle</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-dl-dt group-hover:text-primary dark:group-hover:text-accent truncate">{guide.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400 dark:text-dl-dt2">{guide.platform}</span>
                          <span className="text-[10px] text-gray-300 dark:text-dl-dt2">·</span>
                          <span className="text-[10px] text-gray-400 dark:text-dl-dt2">{guide.difficulty}</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-gray-300 dark:text-dl-dt2 shrink-0">open_in_new</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* ── Sticky footer actions ── */}
      <footer
        data-html2canvas-ignore
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white/95 dark:bg-dl-dark-s/95 backdrop-blur-md border-t border-gray-100 dark:border-dl-dark-b flex gap-3 z-50"
      >
        <button
          onClick={handleCopy}
          className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-dl-dark-b text-gray-700 dark:text-dl-dt text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-dl-dark-s2 transition-all"
        >
          <span className="material-symbols-outlined text-base">{jsonCopied ? 'check' : 'content_copy'}</span>
          {jsonCopied ? 'Copied!' : 'Copy JSON'}
        </button>
        <button
          onClick={exportReport}
          className="flex-1 py-3 rounded-xl bg-primary dark:bg-accent text-white dark:text-dl-dark text-sm font-bold flex items-center justify-center gap-2 shadow-card dark:shadow-glow hover:bg-primary-700 dark:hover:bg-blue-300 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-base">{user?.is_premium ? 'download' : 'lock'}</span>
          {user?.is_premium ? 'Export PDF' : 'Upgrade to Pro'}
        </button>
      </footer>
    </div>
  );
};

export default ResultCard;
