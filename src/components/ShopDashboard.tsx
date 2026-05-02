
import React, { useMemo } from 'react';
import { useApp } from '../providers/AppProvider';
import { Icons, formatCurrency } from '../constants';
import { QueryRecord } from '../types';

interface ShopDashboardProps {
    onInspect: (record: QueryRecord) => void;
}

const ShopDashboard: React.FC<ShopDashboardProps> = ({ onInspect }) => {
  const { history } = useApp();

  const parseCurrency = (str?: string): number => {
    if (!str || typeof str !== 'string') return 0;
    const clean = str.replace(/[^0-9.]/g, '');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  };

  const stats = useMemo(() => {
    let profit = 0;
    let cost = 0;
    const baseCurrency = history[0]?.ai_response?.currency_code || 'USD';

    history.forEach(item => {
        profit += parseCurrency(item.ai_response?.resale_value?.profit_potential);
        cost += parseCurrency(item.ai_response?.potential_fix_cost_estimate);
    });
    
    return { 
        profit, 
        cost, 
        units: history.length,
        potential_revenue: profit + cost,
        currencyCode: baseCurrency
    };
  }, [history]);

  return (
    <div className="space-y-12 py-6 animate-in slide-in-from-bottom-6 duration-700">
        <header className="flex items-center justify-between">
            <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white leading-none">Market Intelligence</h2>
            <div className="flex items-center gap-3 px-4 py-2 bg-primary/20 border border-primary/40 rounded-full">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(19,91,236,0.8)]"></span>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest italic">Live Delta Stream</span>
            </div>
        </header>

        {/* HERO CARDS */}
        <div className="grid grid-cols-2 gap-8">
            {history.length > 0 ? history.slice(0, 2).map((item) => (
                <div key={item.id} className="relative aspect-[4/5] rounded-[3rem] overflow-hidden group cursor-pointer border border-white/5 shadow-2xl" onClick={() => onInspect(item)}>
                    <img src={item.photo_urls[0]} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale group-hover:grayscale-0" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-8">
                        <div className="mb-6">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] italic mb-1 block">Est. Unit Delta</span>
                            <p className="text-white font-black text-4xl tabular-nums tracking-tighter">
                                +{formatCurrency(item.ai_response?.resale_value?.profit_potential, item.ai_response?.currency_code)}
                            </p>
                        </div>
                        <h3 className="text-white font-black text-lg leading-tight truncate uppercase tracking-tight italic">
                          {item.ai_response?.brand} {item.ai_response?.model}
                        </h3>
                        <p className="text-white/40 text-[10px] font-mono mt-1 uppercase tracking-[0.3em]">{item.category}</p>
                        <button className="mt-8 w-full py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] shadow-glow hover:bg-primary hover:text-white transition-all">Inspect Logic</button>
                    </div>
                </div>
            )) : (
                <div className="col-span-2 py-32 bg-white/[0.02] border border-dashed border-white/10 rounded-[4rem] text-center flex flex-col items-center justify-center gap-4">
                    <Icons.Radar className="w-12 h-12 opacity-20" />
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 italic">Initialize telemetry to populate neural market delta</p>
                </div>
            )}
        </div>

        {/* STAT GRID */}
        <div className="grid grid-cols-2 gap-8">
            <DataTile 
                label="Unrealized Yield" 
                value={formatCurrency(stats.profit, stats.currencyCode)} 
                sub="Cumulative Pipeline" 
                percent="+42%" 
                dark 
                icon={<Icons.Circuit className="w-7 h-7" />}
            />
            <DataTile 
                label="Asset Valuation" 
                value={formatCurrency(stats.potential_revenue, stats.currencyCode)} 
                sub="Market Liquidity" 
                percent="+18%" 
                icon={<Icons.Chart className="w-7 h-7" />}
            />
            <DataTile 
                label="Triaged Units" 
                value={stats.units.toString()} 
                sub="Active Fleet Volume" 
                percent="100%" 
                icon={<Icons.Radar className="w-7 h-7" />}
            />
            <DataTile 
                label="Sourcing Pool" 
                value={formatCurrency(stats.cost, stats.currencyCode)} 
                sub="Est. Restoration Overhead" 
                percent="-12%" 
                icon={<Icons.Briefcase className="w-7 h-7" />}
            />
        </div>
    </div>
  );
};

const DataTile = ({ label, value, sub, percent, dark, icon }: { label: string; value: string; sub: string; percent: string; dark?: boolean; icon: React.ReactNode }) => (
    <div className={`rounded-[3rem] p-10 flex flex-col justify-between border transition-all hover:translate-y-[-6px] active:scale-95 cursor-default ${dark ? 'bg-primary text-white border-primary shadow-glow' : 'bg-white/5 text-white border-white/5 shadow-2xl'}`}>
        <div className="flex justify-between items-start mb-12">
            <div className={`p-5 rounded-2xl ${dark ? 'bg-white/10 shadow-inner' : 'bg-white/[0.03] text-primary shadow-sm'}`}>{icon}</div>
            <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${dark ? 'bg-white/20' : 'bg-primary/20 text-primary'}`}>
                {percent}
            </div>
        </div>
        <div>
            <h4 className={`text-[11px] font-black uppercase tracking-[0.4em] mb-3 italic ${dark ? 'text-white/60' : 'text-white/40'}`}>{label}</h4>
            <div className="text-4xl font-black tracking-tighter tabular-nums mb-8 leading-none">{value}</div>
            <div className={`h-px w-full mb-6 ${dark ? 'bg-white/10' : 'bg-white/5'}`}></div>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] italic opacity-60">
                <span>{sub}</span>
            </div>
        </div>
    </div>
);

export default ShopDashboard;
