import React, { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { History, Search, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { formatPrice } from '@harsi/shared';

interface TradeHistoryItem {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  exitPrice: number;
  pnlUsd: number;
  pnlPips: number;
  strategy: string;
  duration: string;
  broker: string;
  mode: 'PAPER' | 'LIVE';
  closedAt: string;
}

const SAMPLE_HISTORY: TradeHistoryItem[] = [
  {
    id: 'trd_1094',
    symbol: 'EURUSD',
    side: 'BUY',
    lots: 0.5,
    entryPrice: 1.0842,
    exitPrice: 1.0876,
    pnlUsd: 170.0,
    pnlPips: 34.0,
    strategy: 'London HARSI',
    duration: '1h 14m',
    broker: 'Paper Desk',
    mode: 'PAPER',
    closedAt: new Date(Date.now() - 3600000 * 3).toLocaleString(),
  },
  {
    id: 'trd_1093',
    symbol: 'GBPUSD',
    side: 'BUY',
    lots: 0.4,
    entryPrice: 1.2715,
    exitPrice: 1.2745,
    pnlUsd: 120.0,
    pnlPips: 30.0,
    strategy: 'Pulse Confluence',
    duration: '42m',
    broker: 'Paper Desk',
    mode: 'PAPER',
    closedAt: new Date(Date.now() - 3600000 * 8).toLocaleString(),
  },
  {
    id: 'trd_1092',
    symbol: 'USDJPY',
    side: 'SELL',
    lots: 0.3,
    entryPrice: 154.65,
    exitPrice: 154.95,
    pnlUsd: -60.0,
    pnlPips: -20.0,
    strategy: 'Breakout + Trend',
    duration: '2h 05m',
    broker: 'Paper Desk',
    mode: 'PAPER',
    closedAt: new Date(Date.now() - 86400000).toLocaleString(),
  },
  {
    id: 'trd_1091',
    symbol: 'BTCUSD',
    side: 'BUY',
    lots: 0.1,
    entryPrice: 63800.0,
    exitPrice: 65200.0,
    pnlUsd: 140.0,
    pnlPips: 1400.0,
    strategy: 'Pulse Confluence',
    duration: '4h 30m',
    broker: 'Paper Desk',
    mode: 'PAPER',
    closedAt: new Date(Date.now() - 86400000 * 2).toLocaleString(),
  },
];

export const HistoryPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'PAPER' | 'LIVE'>('ALL');

  const filtered = SAMPLE_HISTORY.filter((item) => {
    if (filterMode !== 'ALL' && item.mode !== filterMode) return false;
    if (search && !item.symbol.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalRealizedPnl = filtered.reduce((s, t) => s + t.pnlUsd, 0);

  return (
    <div className="min-h-screen bg-[#080b10] flex flex-col">
      <TopBar />
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              Historical Trades Ledger
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Searchable and verifiable audit trail of all closed paper and live trades.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search symbol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#121622] border border-[#1e2638] rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#121622] p-1 rounded-md border border-[#1e2638]">
              {(['ALL', 'PAPER', 'LIVE'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setFilterMode(m)}
                  className={`px-3 py-1 text-xs font-semibold rounded transition ${
                    filterMode === m
                      ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trade Ledger Table */}
        <div className="terminal-card overflow-x-auto bg-[#0e131d]">
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Trade ID</th>
                <th>Closed At</th>
                <th>Asset</th>
                <th>Side</th>
                <th>Size</th>
                <th>Entry Price</th>
                <th>Exit Price</th>
                <th>P/L ($)</th>
                <th>P/L (Pips)</th>
                <th>Strategy</th>
                <th>Duration</th>
                <th>Broker</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const isBuy = t.side === 'BUY';
                const isProfit = t.pnlUsd >= 0;

                return (
                  <tr key={t.id} className="font-mono text-xs">
                    <td className="text-slate-400">{t.id}</td>
                    <td className="text-slate-400">{t.closedAt}</td>
                    <td className="font-bold text-white">{t.symbol}</td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          isBuy ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {t.side}
                      </span>
                    </td>
                    <td>{t.lots} lots</td>
                    <td className="text-slate-300">{formatPrice(t.symbol, t.entryPrice)}</td>
                    <td className="text-white font-bold">{formatPrice(t.symbol, t.exitPrice)}</td>
                    <td className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isProfit ? '+' : ''}${t.pnlUsd.toFixed(2)}
                    </td>
                    <td className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                      {t.pnlPips > 0 ? '+' : ''}{t.pnlPips.toFixed(1)}p
                    </td>
                    <td className="font-sans text-slate-300">{t.strategy}</td>
                    <td className="text-slate-400">{t.duration}</td>
                    <td className="text-slate-400">{t.broker}</td>
                    <td>
                      <span className="badge-paper text-[10px]">{t.mode}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
