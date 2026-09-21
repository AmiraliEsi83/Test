import React, { useState, useEffect } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Percent,
  Calendar,
  Layers,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [mode, setMode] = useState<'PAPER' | 'LIVE'>('PAPER');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch(`/api/analytics?mode=${mode}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const resData = await res.json();
          setData(resData);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadAnalytics();
  }, [mode, token]);

  const overview = data?.accountOverview || {
    equity: 102920.7,
    balance: 100000.0,
    winRate: 64.3,
    profitFactor: 1.82,
    totalTrades: 45,
    avgWinnerUsd: 142.5,
    avgLoserUsd: -84.2,
    avgRiskReward: 1.62,
    maxDrawdownPct: 1.42,
    todayPnl: 110.0,
    tradesPerDay: 4.5,
    longVsShort: { long: 28, short: 17 },
  };

  return (
    <div className="min-h-screen bg-[#080b10] flex flex-col">
      <TopBar />
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Institutional Quantitative Analytics
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Expectancy ratios, Sharpe distributions, win rates, and drawdown metrics.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#121622] p-1 rounded-md border border-[#1e2638]">
            <button
              onClick={() => setMode('PAPER')}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                mode === 'PAPER'
                  ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              PAPER DATA
            </button>
            <button
              onClick={() => setMode('LIVE')}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                mode === 'LIVE'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              LIVE BROKER DATA
            </button>
          </div>
        </div>

        {/* Top Key Performance Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="terminal-card p-3 bg-[#0e131d]">
            <div className="text-[11px] text-slate-400">Win Rate</div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
              {overview.winRate}%
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {overview.totalTrades} closed trades
            </div>
          </div>

          <div className="terminal-card p-3 bg-[#0e131d]">
            <div className="text-[11px] text-slate-400">Profit Factor</div>
            <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
              {overview.profitFactor}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Gross Win / Gross Loss</div>
          </div>

          <div className="terminal-card p-3 bg-[#0e131d]">
            <div className="text-[11px] text-slate-400">Max Drawdown</div>
            <div className="text-lg font-bold font-mono text-amber-400 mt-1">
              {overview.maxDrawdownPct}%
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Peak-to-valley equity</div>
          </div>

          <div className="terminal-card p-3 bg-[#0e131d]">
            <div className="text-[11px] text-slate-400">Avg Risk:Reward</div>
            <div className="text-lg font-bold font-mono text-indigo-300 mt-1">
              1:{overview.avgRiskReward}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Realized SL / TP</div>
          </div>

          <div className="terminal-card p-3 bg-[#0e131d]">
            <div className="text-[11px] text-slate-400">Avg Winner</div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
              +${overview.avgWinnerUsd}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Per profitable trade</div>
          </div>

          <div className="terminal-card p-3 bg-[#0e131d]">
            <div className="text-[11px] text-slate-400">Avg Loser</div>
            <div className="text-lg font-bold font-mono text-rose-400 mt-1">
              ${overview.avgLoserUsd}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Strict stop controlled</div>
          </div>
        </div>

        {/* Breakdown Grids */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Performance by Strategy */}
          <div className="terminal-card p-4 bg-[#0e131d]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Performance by Strategy
            </h3>
            <div className="space-y-3">
              {[
                { name: 'London HARSI', winRate: '68.4%', profit: '+$1,420.50', trades: 14 },
                { name: 'Pulse Confluence', winRate: '61.2%', profit: '+$890.00', trades: 22 },
                { name: 'Breakout + Trend', winRate: '57.8%', profit: '+$610.20', trades: 9 },
              ].map((s) => (
                <div
                  key={s.name}
                  className="p-2.5 rounded bg-[#121622] border border-[#1b2232] flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <div className="font-bold text-white font-sans">{s.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {s.trades} trades · {s.winRate} win rate
                    </div>
                  </div>
                  <div className="text-right font-bold text-emerald-400">{s.profit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance by Asset */}
          <div className="terminal-card p-4 bg-[#0e131d]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Performance by Asset
            </h3>
            <div className="space-y-3">
              {[
                { symbol: 'EUR/USD', trades: 18, pnl: '+$1,140.00', winRate: '66.7%' },
                { symbol: 'GBP/USD', trades: 14, pnl: '+$820.00', winRate: '57.1%' },
                { symbol: 'BTC/USD', trades: 5, pnl: '+$1,080.70', winRate: '60.0%' },
                { symbol: 'USD/JPY', trades: 8, pnl: '-$120.00', winRate: '50.0%' },
              ].map((a) => (
                <div
                  key={a.symbol}
                  className="p-2.5 rounded bg-[#121622] border border-[#1b2232] flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <div className="font-bold text-white">{a.symbol}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {a.trades} trades · {a.winRate} win rate
                    </div>
                  </div>
                  <div
                    className={`font-bold ${
                      a.pnl.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {a.pnl}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Directional Distribution (Long vs Short) */}
          <div className="terminal-card p-4 bg-[#0e131d]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Trade Distribution & Volume
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded bg-[#121622] border border-[#1b2232]">
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Directional Bias</span>
                  <span className="font-mono text-white">62% Long / 38% Short</span>
                </div>
                <div className="w-full h-2 rounded-full bg-rose-500/40 overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: '62%' }} />
                </div>
              </div>

              <div className="p-3 rounded bg-[#121622] border border-[#1b2232] space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Trades / Day:</span>
                  <span className="text-white font-bold">{overview.tradesPerDay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Capital Deployed:</span>
                  <span className="text-white font-bold">$18,500</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sharpe Ratio (Est):</span>
                  <span className="text-emerald-400 font-bold">2.18</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
