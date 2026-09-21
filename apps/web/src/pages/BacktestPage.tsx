import React, { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import { FlaskConical, Play, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { BacktestResult, formatPrice } from '@harsi/shared';

export const BacktestPage: React.FC = () => {
  const { token, plan } = useAuth();
  const [strategyId, setStrategyId] = useState('london-harsi');
  const [symbol, setSymbol] = useState('EURUSD');
  const [timeframe, setTimeframe] = useState('15m');
  const [startingBalance, setStartingBalance] = useState(100000);
  const [riskPct, setRiskPct] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          strategyId,
          symbol,
          timeframe,
          startingBalance,
          riskPct,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Backtest failed');
      }
      setResult(data.result);
    } catch (err: any) {
      setError(err.message || 'Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b10] flex flex-col">
      <TopBar />
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-400" />
            Event-Driven Backtesting Lab
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulate quantitative algorithms bar-by-bar across historical candles without look-ahead bias.
          </p>
        </div>

        {plan === 'FREE' && (
          <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Free accounts are limited to basic runs. Upgrade to Trader Pro for unlimited backtesting and custom parameter tuning.
            </span>
          </div>
        )}

        {/* Configurator Form */}
        <div className="terminal-card p-5 bg-[#0e131d]">
          <form onSubmit={handleRun} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Strategy</label>
              <select
                value={strategyId}
                onChange={(e) => setStrategyId(e.target.value)}
                className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs text-white"
              >
                <option value="london-harsi">London HARSI</option>
                <option value="pulse-confluence">Pulse Confluence</option>
                <option value="breakout-trend">Breakout + Trend</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs text-white"
              >
                <option value="EURUSD">EUR/USD</option>
                <option value="GBPUSD">GBP/USD</option>
                <option value="USDJPY">USD/JPY</option>
                <option value="XAUUSD">XAU/USD</option>
                <option value="BTCUSD">BTC/USD</option>
                <option value="SPY">SPY (S&P 500)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs text-white"
              >
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes</option>
                <option value="1h">1 Hour</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Initial Balance</label>
              <input
                type="number"
                value={startingBalance}
                onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 100000)}
                className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs font-mono text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Risk per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                value={riskPct}
                onChange={(e) => setRiskPct(parseFloat(e.target.value) || 1.0)}
                className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs font-mono text-white"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary text-xs flex items-center justify-center gap-1.5 py-2 font-bold"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{loading ? 'Simulating...' : 'Run Simulation'}</span>
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="p-3 rounded bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Results View */}
        {result && (
          <div className="space-y-6">
            {/* Performance Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 font-mono">
              <div className="terminal-card p-3 bg-[#0e131d]">
                <div className="text-[11px] text-slate-400">Final Equity</div>
                <div className="text-lg font-bold text-white mt-1">
                  ${result.finalBalance.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">
                  +{result.returnPct}% Net Return
                </div>
              </div>

              <div className="terminal-card p-3 bg-[#0e131d]">
                <div className="text-[11px] text-slate-400">Win Rate</div>
                <div className="text-lg font-bold text-emerald-400 mt-1">
                  {result.winRate}%
                </div>
                <div className="text-[10px] text-slate-500">
                  {result.winningTrades}W / {result.losingTrades}L
                </div>
              </div>

              <div className="terminal-card p-3 bg-[#0e131d]">
                <div className="text-[11px] text-slate-400">Profit Factor</div>
                <div className="text-lg font-bold text-cyan-400 mt-1">
                  {result.profitFactor}
                </div>
                <div className="text-[10px] text-slate-500">Gross win / loss</div>
              </div>

              <div className="terminal-card p-3 bg-[#0e131d]">
                <div className="text-[11px] text-slate-400">Max Drawdown</div>
                <div className="text-lg font-bold text-amber-400 mt-1">
                  {result.maxDrawdownPct}%
                </div>
                <div className="text-[10px] text-slate-500">Peak equity risk</div>
              </div>

              <div className="terminal-card p-3 bg-[#0e131d]">
                <div className="text-[11px] text-slate-400">Total Trades</div>
                <div className="text-lg font-bold text-white mt-1">
                  {result.totalTrades}
                </div>
                <div className="text-[10px] text-slate-500">Closed simulated</div>
              </div>

              <div className="terminal-card p-3 bg-[#0e131d]">
                <div className="text-[11px] text-slate-400">Avg Trade</div>
                <div className="text-lg font-bold text-emerald-400 mt-1">
                  +${result.averageTrade}
                </div>
                <div className="text-[10px] text-slate-500">Per execution</div>
              </div>
            </div>

            {/* Simulated Trade Log */}
            <div className="terminal-card overflow-x-auto bg-[#0e131d]">
              <div className="px-4 py-2.5 border-b border-[#1e2638] text-xs font-bold uppercase tracking-wider text-slate-300">
                Simulated Execution Log ({result.trades.length} Executed Trades)
              </div>
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Asset</th>
                    <th>Side</th>
                    <th>Entry Price</th>
                    <th>Exit Price</th>
                    <th>P/L ($)</th>
                    <th>P/L (Pips)</th>
                    <th>Return</th>
                    <th>Trigger Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, idx) => (
                    <tr key={t.id} className="font-mono text-xs">
                      <td className="text-slate-500">{idx + 1}</td>
                      <td className="font-bold text-white">{t.symbol}</td>
                      <td className={t.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                        {t.side}
                      </td>
                      <td>{formatPrice(t.symbol, t.entryPrice)}</td>
                      <td>{formatPrice(t.symbol, t.exitPrice)}</td>
                      <td className={t.pnlUsd >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {t.pnlUsd >= 0 ? '+' : ''}${t.pnlUsd.toFixed(2)}
                      </td>
                      <td className={t.pnlPips >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {t.pnlPips > 0 ? '+' : ''}{t.pnlPips.toFixed(1)}p
                      </td>
                      <td className={t.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {t.returnPct > 0 ? '+' : ''}{t.returnPct}%
                      </td>
                      <td className="text-slate-400 font-sans text-[11px]">{t.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
