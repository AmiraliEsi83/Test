import React from "react";
import { useTrading } from "../context/TradingContext";
import { PageHeader, Stat } from "../components/ui";
import { evaluateRisk } from "../lib/risk";

export default function RiskPage() {
  const { risk, setRisk, positions, closed, brokers, activeBrokerId, addAudit } = useTrading();
  const broker = brokers.find((b) => b.id === activeBrokerId);
  const preview = evaluateRisk({ order: { symbol: "EURUSD", lots: risk.maxPositionLots }, account: { balance: broker?.balance }, positions, closed, risk });
  const set = (k, v) => setRisk({ ...risk, [k]: v });

  return (
    <div className="page dash">
      <PageHeader kicker="Risk desk" title="Risk manager" sub="Automated strategies must pass this layer before execution. Architecture: Strategy → Signal → Risk → Order → Broker." right={<button className="btn btn-ghost btn-sm" onClick={() => { addAudit("strategy_changed", "Risk settings updated"); }}>Audit touch</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="card">
          {[
            ["riskPerTradePct", "Risk per trade (%)", 0.1, 5, 0.1],
            ["maxPositionLots", "Max position (lots)", 0.01, 10, 0.01],
            ["maxDailyLossUsd", "Max daily loss (USD)", 50, 5000, 10],
            ["maxOpenPositions", "Max open positions", 1, 20, 1],
            ["maxExposurePerAsset", "Max exposure per asset", 1, 10, 1],
            ["stopAfterConsecutiveLosses", "Stop after N losses", 1, 10, 1],
          ].map(([k, label, min, max, step]) => (
            <div key={k} className="field">
              <label>{label}: <b className="mono">{risk[k]}</b></label>
              <input type="range" min={min} max={max} step={step} value={risk[k]} onChange={(e) => set(k, Number(e.target.value))} />
            </div>
          ))}
          <label className="faint"><input type="checkbox" checked={!!risk.killSwitch} onChange={(e) => set("killSwitch", e.target.checked)} /> Daily kill switch (halt all automation)</label>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <Stat label="Today's realized" value={`${preview.dayPnl >= 0 ? "+" : ""}$${preview.dayPnl.toFixed(2)}`} sub={`Loss streak ${preview.streak} · Risk/trade $${preview.riskUsd.toFixed(2)}`} />
          <div className="card">
            <h3>Gate preview</h3>
            {preview.allowed ? <p className="up">A {risk.maxPositionLots}-lot EURUSD order would PASS right now.</p> : preview.reasons.map((r, i) => <div key={i} className="error" style={{ marginBottom: 6 }}>{r}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
