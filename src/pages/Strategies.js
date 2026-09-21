import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTrading } from "../context/TradingContext";
import { STRATEGY_META } from "../lib/strategies";
import { planAllows } from "../lib/storage";
import { PageHeader, ChecksList, Empty } from "../components/ui";

const FIELDS = {
  "london-harsi": [
    { key: "timeframe", label: "Timeframe", type: "select", options: ["1m", "5m"] },
    { key: "buyMin", label: "Buy band min", type: "number" },
    { key: "buyMax", label: "Buy band max", type: "number" },
    { key: "sellMin", label: "Sell band min", type: "number" },
    { key: "sellMax", label: "Sell band max", type: "number" },
    { key: "slPips", label: "Stop (pips)", type: "number" },
    { key: "tpPips", label: "Target (pips)", type: "number" },
    { key: "cooldownMin", label: "Cooldown (min)", type: "number" },
    { key: "maxSignalsPerDay", label: "Max signals/day", type: "number" },
  ],
  "pulse-confluence": [
    { key: "timeframe", label: "Timeframe", type: "select", options: ["1m", "5m", "15m"] },
    { key: "minScore", label: "Min score", type: "number" },
    { key: "minEdge", label: "Min edge", type: "number" },
    { key: "cooldownMin", label: "Cooldown (min)", type: "number" },
    { key: "maxSignalsPerDay", label: "Max signals/day", type: "number" },
  ],
  "breakout-trend": [
    { key: "timeframe", label: "Timeframe", type: "select", options: ["5m", "15m", "1h"] },
    { key: "lookback", label: "Range lookback (bars)", type: "number" },
    { key: "atrMultSl", label: "ATR × stop", type: "number" },
    { key: "atrMultTp", label: "ATR × target", type: "number" },
    { key: "cooldownMin", label: "Cooldown (min)", type: "number" },
  ],
};

export default function Strategies() {
  const { strategies, toggleStrategy, updateStrategy, signals, closed } = useTrading();
  const { plan } = useAuth();
  const [open, setOpen] = useState(null);

  return (
    <div className="page dash">
      <PageHeader kicker="Strategy Center" title="Strategies" sub="Modular plugins. Every signal explains which conditions fired. Nothing here guarantees returns." right={<Link to="/backtest" className="btn btn-ghost btn-sm">Backtest a strategy</Link>} />
      <div className="grid-3">
        {Object.values(strategies).map((s) => {
          const meta = STRATEGY_META[s.id];
          const allowed = planAllows(plan, "strategy", s.id);
          const recent = signals.filter((x) => x.algorithm === s.id).slice(0, 3);
          const tested = closed.filter((x) => x.algorithm === s.id);
          const wins = tested.filter((x) => x.pnl > 0).length;
          return (
            <div key={s.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="badge badge-teal">{meta.badge}</span>
                <span className={`badge ${s.enabled ? "badge-buy" : "badge-sell"}`}>{s.enabled ? "ACTIVE" : "OFF"}</span>
              </div>
              <h3>{s.name}</h3>
              <p className="muted" style={{ fontSize: 13 }}>{meta.summary}</p>
              <div className="faint mono" style={{ fontSize: 11 }}>{s.timeframe} · {(s.symbols || []).join(", ")}</div>
              {!allowed && <div className="error" style={{ marginTop: 8 }}>Requires {meta.tier.join(" or ")} plan. <Link to="/pricing">Upgrade</Link></div>}
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{tested.length} paper trades · {tested.length ? Math.round((wins / tested.length) * 100) : 0}% win · {recent.length} recent signals</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button className="btn btn-ghost btn-sm" disabled={!allowed} onClick={() => toggleStrategy(s.id)}>{s.enabled ? "Disable" : "Enable"}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setOpen(open === s.id ? null : s.id)}>Settings</button>
                <Link to={`/signals?strategy=${s.id}`} className="btn btn-ghost btn-sm">Signals</Link>
              </div>
              {open === s.id && (
                <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  {(FIELDS[s.id] || []).map((f) => (
                    <div key={f.key} className="field">
                      <label>{f.label}</label>
                      {f.type === "select" ? (
                        <select value={s[f.key]} onChange={(e) => updateStrategy(s.id, { [f.key]: e.target.value })}>
                          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type="number" value={s[f.key]} onChange={(e) => updateStrategy(s.id, { [f.key]: Number(e.target.value) })} />
                      )}
                    </div>
                  ))}
                  <div className="field">
                    <label>Symbols (comma separated)</label>
                    <input value={(s.symbols || []).join(",")} onChange={(e) => updateStrategy(s.id, { symbols: e.target.value.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean) })} />
                  </div>
                  <p className="muted" style={{ fontSize: 12 }}>{meta.detail}</p>
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                {recent.map((r) => (
                  <div key={r.id} className={`alert-item ${r.side}`} style={{ fontSize: 12 }}>
                    <b>{r.side.toUpperCase()} {r.symbol}</b> · {new Date(r.ts).toLocaleTimeString()}
                    <div className="muted">{r.reason?.slice(0, 120)}</div>
                  </div>
                ))}
                {!recent.length && <p className="faint" style={{ fontSize: 12 }}>No signals yet for this strategy.</p>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h3>How to read a signal</h3>
        <p className="muted">Open any signal in <Link to="/signals">Signal Center</Link> to see entry, stop, target, risk/reward, timestamp and per-condition checks.</p>
        <ChecksList checks={[{ label: "Example: EMA 9 > EMA 21", pass: true, value: "1.08342 vs 1.08310" }, { label: "Example: RSI 58.1", pass: true, value: "58.1" }]} />
      </div>
    </div>
  );
}

export function StrategyExplainer() {
  return <Empty title="Strategies" sub="See /strategies" />;
}
