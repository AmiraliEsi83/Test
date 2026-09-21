import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTrading } from "../context/TradingContext";
import { generateHistory } from "../lib/market";
import { runBacktest } from "../lib/backtest";
import { INSTRUMENT_LIST } from "../lib/instruments";
import { PageHeader, EquityCurve, Empty } from "../components/ui";

export default function Backtest() {
  const { backtests, setBacktests, addAudit } = useTrading();
  const { plan } = useAuth();
  const [cfg, setCfg] = useState({ strategy: "pulse-confluence", symbol: "EURUSD", timeframe: "15m", startingBalance: 10000, lots: 0.1, lookback: 40, slPips: 20, tpPips: 30 });
  const [result, setResult] = useState(null);

  if (!plan.backtest) {
    return (
      <div className="page dash">
        <PageHeader kicker="Backtest" title="Strategy backtests" sub="Backtesting requires Trader or Pro." />
        <Empty title="Upgrade for backtesting" sub="Run any strategy over historical candles with no look-ahead." action={<Link to="/pricing" className="btn btn-primary btn-sm">See plans</Link>} />
      </div>
    );
  }

  const run = () => {
    const hist = generateHistory(cfg.symbol, 600);
    const out = runBacktest({ candles: hist.candles, symbol: cfg.symbol, strategyId: cfg.strategy, startingBalance: Number(cfg.startingBalance), riskLots: Number(cfg.lots), params: { lookback: Number(cfg.lookback), slPips: Number(cfg.slPips), tpPips: Number(cfg.tpPips), everyN: 25 } });
    const record = { id: `bt_${Date.now()}`, ts: Date.now(), ...cfg, stats: out.stats, trades: out.trades.slice(-60), equity: out.equity };
    setResult(record);
    setBacktests([record, ...backtests].slice(0, 20));
    addAudit("strategy_changed", `Backtest ${cfg.strategy} on ${cfg.symbol}: ${out.stats.trades} trades, net ${out.stats.net.toFixed(2)}`);
  };

  return (
    <div className="page dash">
      <PageHeader kicker="Backtest · no look-ahead" title="Backtesting" sub="Same candle engine as the terminal. Saved runs persist per account." right={<button className="btn btn-primary btn-sm" onClick={run}>Run backtest</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 }}>
        <div className="card">
          {[
            ["strategy", "Strategy"], ["symbol", "Instrument"], ["timeframe", "Timeframe"],
          ].map(([k, label]) => (
            <div key={k} className="field">
              <label>{label}</label>
              {k === "strategy" && <select value={cfg.strategy} onChange={(e) => setCfg({ ...cfg, strategy: e.target.value })}><option value="london-harsi">London HARSI</option><option value="pulse-confluence">Pulse Confluence</option><option value="breakout-trend">Breakout + Trend</option></select>}
              {k === "symbol" && <select value={cfg.symbol} onChange={(e) => setCfg({ ...cfg, symbol: e.target.value })}>{INSTRUMENT_LIST.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>}
              {k === "timeframe" && <select value={cfg.timeframe} onChange={(e) => setCfg({ ...cfg, timeframe: e.target.value })}><option>1m</option><option>5m</option><option>15m</option><option>1h</option></select>}
            </div>
          ))}
          {[["startingBalance", "Starting balance"], ["lots", "Lots"], ["lookback", "Lookback"], ["slPips", "SL pips"], ["tpPips", "TP pips"]].map(([k, label]) => (
            <div key={k} className="field">
              <label>{label}</label>
              <input type="number" value={cfg[k]} onChange={(e) => setCfg({ ...cfg, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {result && (
            <div className="card">
              <h3>Result · {result.strategy} on {result.symbol}</h3>
              <div className="mono" style={{ fontSize: 13 }}>Trades {result.stats.trades} · Win {result.stats.winRate.toFixed(1)}% · Net {result.stats.net >= 0 ? "+" : ""}{result.stats.net.toFixed(2)} · PF {result.stats.profitFactor.toFixed(2)} · DD {result.stats.maxDd.toFixed(2)} · End {result.stats.endBalance.toFixed(2)}</div>
              <div className="faint mono" style={{ fontSize: 11 }}>Params: {JSON.stringify({ lookback: result.lookback, sl: result.slPips, tp: result.tpPips, lots: result.lots })}</div>
              <EquityCurve points={result.equity} height={180} />
            </div>
          )}
          <div className="card">
            <h3>Saved runs ({backtests.length})</h3>
            {backtests.map((b) => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span>{b.strategy} · {b.symbol} · {new Date(b.ts).toLocaleString()}</span>
                <span className={b.stats.net >= 0 ? "up" : "down"}>{b.stats.trades} trades · {b.stats.net.toFixed(0)}</span>
              </div>
            ))}
            {!backtests.length && <p className="muted">No runs yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
