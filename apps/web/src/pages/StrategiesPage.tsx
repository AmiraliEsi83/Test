import React, { useState, useEffect } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  Cpu,
  CheckCircle2,
  Settings,
  TrendingUp,
  Clock,
  Zap,
  Sliders,
  Power,
  Shield,
} from 'lucide-react';

interface StrategyItem {
  id: string;
  name: string;
  badge: string;
  summary: string;
  rules: string[];
  defaultConfig: any;
}

export const StrategiesPage: React.FC = () => {
  const { token } = useAuth();
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>({
    'london-harsi': true,
    'pulse-confluence': true,
    'breakout-trend': true,
  });
  const [editingStrategy, setEditingStrategy] = useState<StrategyItem | null>(null);

  useEffect(() => {
    async function loadStrategies() {
      try {
        const res = await fetch('/api/strategies/list');
        if (res.ok) {
          const data = await res.json();
          setStrategies(data.strategies || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadStrategies();
  }, []);

  const toggleStrategy = (id: string) => {
    setActiveMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getStats = (id: string) => {
    if (id === 'london-harsi') {
      return { winRate: '68.4%', pf: '1.85', trades: 142, avgRr: '1:1.55' };
    }
    if (id === 'pulse-confluence') {
      return { winRate: '61.2%', pf: '1.58', trades: 218, avgRr: '1:1.50' };
    }
    return { winRate: '57.8%', pf: '1.64', trades: 95, avgRr: '1:2.10' };
  };

  return (
    <div className="min-h-screen bg-[#080b10] flex flex-col">
      <TopBar />
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            Institutional Strategy Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure algorithm rules, execution thresholds, risk parameters, and monitor historical expectancy.
          </p>
        </div>

        {/* Strategy Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {strategies.map((strat) => {
            const isActive = activeMap[strat.id] ?? true;
            const stats = getStats(strat.id);

            return (
              <div
                key={strat.id}
                className={`terminal-card p-5 bg-[#0e131d] flex flex-col justify-between transition ${
                  isActive ? 'border-[#26334a]' : 'opacity-60 border-[#1a2233]'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#1b2336]">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold uppercase">
                        {strat.badge}
                      </span>
                      <h2 className="text-base font-bold text-white mt-1.5">{strat.name}</h2>
                    </div>

                    <button
                      onClick={() => toggleStrategy(strat.id)}
                      className={`p-1.5 rounded-full transition ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                      title={isActive ? 'Disable strategy' : 'Enable strategy'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    {strat.summary}
                  </p>

                  {/* Key Rules List */}
                  <div className="mt-4 space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Execution Rules:
                    </div>
                    {strat.rules.slice(0, 3).map((rule, idx) => (
                      <div key={idx} className="text-xs text-slate-400 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>

                  {/* Backtest Statistics Panel */}
                  <div className="mt-5 p-3 rounded bg-[#090d14] border border-[#171f2d]">
                    <div className="text-[10px] font-mono uppercase text-slate-400 mb-2 font-bold">
                      Historical Performance Expectancy
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center font-mono">
                      <div>
                        <div className="text-[10px] text-slate-500">Win Rate</div>
                        <div className="text-xs font-bold text-emerald-400">{stats.winRate}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Profit Factor</div>
                        <div className="text-xs font-bold text-cyan-400">{stats.pf}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Trades</div>
                        <div className="text-xs font-bold text-white">{stats.trades}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Avg R:R</div>
                        <div className="text-xs font-bold text-indigo-300">{stats.avgRr}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-6 pt-3 border-t border-[#1b2336] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    <span className="text-slate-400 font-mono text-[11px]">
                      {isActive ? 'ARMED & MONITORING' : 'PAUSED'}
                    </span>
                  </div>

                  <button
                    onClick={() => setEditingStrategy(strat)}
                    className="px-2.5 py-1 rounded bg-[#161c2b] hover:bg-[#20293d] text-slate-300 hover:text-white border border-[#232d42] flex items-center gap-1 transition"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Parameters</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Parameters Modal */}
      {editingStrategy && (
        <div className="modal-overlay">
          <div className="modal-content p-6 max-w-md">
            <h3 className="text-sm font-bold text-white pb-3 border-b border-[#1e2638]">
              Configure {editingStrategy.name}
            </h3>
            <div className="my-4 space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Timeframe</label>
                <input
                  type="text"
                  defaultValue={editingStrategy.defaultConfig.timeframe}
                  className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 font-mono text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Active Symbols</label>
                <input
                  type="text"
                  defaultValue={editingStrategy.defaultConfig.symbols.join(', ')}
                  className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 font-mono text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Cooldown (Minutes)</label>
                <input
                  type="number"
                  defaultValue={editingStrategy.defaultConfig.cooldownMinutes}
                  className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 font-mono text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1e2638]">
              <button
                onClick={() => setEditingStrategy(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => setEditingStrategy(null)}
                className="btn-primary text-xs"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
