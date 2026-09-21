import React, { useState } from "react";
import { useTrading } from "../context/TradingContext";
import { PageHeader } from "../components/ui";

const ROWS = [
  ["london-harsi", "London HARSI"],
  ["pulse-confluence", "Pulse Confluence"],
  ["breakout-trend", "Breakout + Trend"],
];

export default function Automation() {
  const { automation, setAutomation, stopAllAutomation, addAudit, mode } = useTrading();
  const [confirmLive, setConfirmLive] = useState(null);

  const set = (id, key, val) => {
    setAutomation({ ...automation, [id]: { ...automation[id], [key]: val } });
    addAudit("automation_enabled", `${id} ${key} -> ${val}`);
  };

  return (
    <div className="page dash">
      <PageHeader
        kicker="Automation · PAPER vs LIVE"
        title="Automation controls"
        sub="Decide per strategy whether it only alerts, paper-trades, or is allowed to touch live. Live auto-execute needs explicit confirmation and is never silent."
        right={<button className="btn btn-sell btn-sm" onClick={() => { if (window.confirm("STOP ALL AUTOMATION? This halts every auto route immediately.")) stopAllAutomation(); }}>STOP ALL AUTOMATION</button>}
      />
      {automation.stopped && <div className="error">Kill switch ENGAGED — all automation halted. Re-enable per strategy below to resume.</div>}
      {mode === "live" && <div className="card" style={{ borderColor: "var(--sell)" }}>LIVE mode is selected. Live auto-execute below is real routing — double-check broker, risk limits and kill switch.</div>}
      <div className="card">
        <table className="pos-table">
          <thead><tr><th>Strategy</th><th>Alerts</th><th>Paper auto-execute</th><th>Live auto-execute</th></tr></thead>
          <tbody>
            {ROWS.map(([id, label]) => (
              <tr key={id}>
                <td>{label}</td>
                <td><input type="checkbox" checked={automation[id]?.alerts !== false} onChange={(e) => set(id, "alerts", e.target.checked)} /></td>
                <td><input type="checkbox" checked={!!automation[id]?.paperAuto} onChange={(e) => set(id, "paperAuto", e.target.checked)} /></td>
                <td>
                  <input type="checkbox" checked={!!automation[id]?.liveAuto} onChange={(e) => {
                    if (e.target.checked) setConfirmLive(id);
                    else set(id, "liveAuto", false);
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {confirmLive && (
        <div className="modal-back" onClick={() => setConfirmLive(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Enable LIVE auto-execute?</h3>
            <p className="muted">This allows <b>{confirmLive}</b> to submit real orders to your connected live broker without asking each time. Risk limits still apply, and STOP ALL halts it instantly.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmLive(null)}>Cancel</button>
              <button className="btn btn-sell btn-sm" onClick={() => { set(confirmLive, "liveAuto", true); setConfirmLive(null); }}>I understand — enable live</button>
            </div>
          </div>
        </div>
      )}
      <div className="card">
        <h3>Pipeline</h3>
        <p className="mono muted">Strategy → Signal → Risk Manager → Order Manager → Broker Adapter</p>
        <p className="muted" style={{ fontSize: 13 }}>Every automated signal passes risk checks (size, exposure, daily loss, consecutive losses, kill switch) before any order is created. Blocked orders appear in the audit log.</p>
      </div>
    </div>
  );
}
