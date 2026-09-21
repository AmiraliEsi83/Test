import React, { useState, useEffect } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { useTrading } from '../context/TradingContext';
import { Signal, formatPrice } from '@harsi/shared';
import { SignalDetailModal } from '../components/modals/SignalDetailModal';
import { Radio, ArrowUpRight, ArrowDownRight, Info, Filter } from 'lucide-react';

export const SignalsPage: React.FC = () => {
  const { signals, setSelectedSignal, selectedSignal, placeOrder } = useTrading();
  const [filterStrategy, setFilterStrategy] = useState<string>('ALL');
  const [filterSide, setFilterSide] = useState<string>('ALL');
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');

  const filtered = signals.filter((s) => {
    if (filterStrategy !== 'ALL' && s.strategyId !== filterStrategy) return false;
    if (filterSide !== 'ALL' && s.side !== filterSide) return false;
    if (filterSymbol !== 'ALL' && s.symbol !== filterSymbol) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#080b10] flex flex-col">
      <TopBar />
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              Institutional Signal Center
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live & historical quantitative execution alerts with complete mathematical condition breakdown.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-[#121622] px-2.5 py-1.5 rounded border border-[#1e2638]">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Strategy:</span>
              <select
                value={filterStrategy}
                onChange={(e) => setFilterStrategy(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none"
              >
                <option value="ALL">All Strategies</option>
                <option value="london-harsi">London HARSI</option>
                <option value="pulse-confluence">Pulse Confluence</option>
                <option value="breakout-trend">Breakout + Trend</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#121622] px-2.5 py-1.5 rounded border border-[#1e2638]">
              <span className="text-slate-400">Side:</span>
              <select
                value={filterSide}
                onChange={(e) => setFilterSide(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none"
              >
                <option value="ALL">All Sides</option>
                <option value="BUY">BUY Only</option>
                <option value="SELL">SELL Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Signals Table */}
        <div className="terminal-card overflow-x-auto bg-[#0e131d]">
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Trigger Time</th>
                <th>Asset</th>
                <th>Strategy</th>
                <th>Side</th>
                <th>Entry Price</th>
                <th>Stop Loss</th>
                <th>Take Profit</th>
                <th>R:R</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-500">
                    No signals matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((sig) => {
                  const isBuy = sig.side === 'BUY';
                  return (
                    <tr key={sig.id} className="font-mono text-xs">
                      <td className="text-slate-400">
                        {new Date(sig.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="font-bold text-white">{sig.symbol}</td>
                      <td className="text-slate-300 font-sans">{sig.strategyName}</td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            isBuy ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {sig.side}
                        </span>
                      </td>
                      <td className="text-white font-bold">{formatPrice(sig.symbol, sig.entry)}</td>
                      <td className="text-rose-400">{formatPrice(sig.symbol, sig.stopLoss)}</td>
                      <td className="text-emerald-400">{formatPrice(sig.symbol, sig.takeProfit)}</td>
                      <td className="text-cyan-300">{sig.riskReward}</td>
                      <td>
                        <span className="badge-buy text-[10px] uppercase">{sig.status}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedSignal(sig)}
                          className="px-2.5 py-1 rounded bg-[#161c2b] hover:bg-[#21293d] text-slate-300 hover:text-white border border-[#232d42] text-[11px] font-sans flex items-center gap-1 transition"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Explain</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      <SignalDetailModal
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
        onExecute={(sig) => {
          placeOrder({
            symbol: sig.symbol,
            side: sig.side,
            lots: 0.5,
            price: sig.price,
            stopLoss: sig.stopLoss,
            takeProfit: sig.takeProfit,
            strategyId: sig.strategyId,
          });
        }}
      />
    </div>
  );
};
