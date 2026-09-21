import React, { useState } from "react";
import { useTrading } from "../context/TradingContext";
import { BROKER_CATALOG, validateBrokerFields, maskSecret } from "../lib/brokers";
import { brokerDisplayStatus, LIVE_BROKERS } from "../lib/brokerAdapters";
import { PageHeader } from "../components/ui";

export default function Brokers() {
  const { brokers, activeBrokerId, setActiveBrokerId, connectBroker, disconnectBroker, mode } = useTrading();
  const [open, setOpen] = useState(null);
  const [vals, setVals] = useState({});
  const [err, setErr] = useState("");

  const submit = (spec) => {
    const e = validateBrokerFields(spec.type, vals);
    if (e) { setErr(e); return; }
    try {
      connectBroker({ type: spec.type, name: spec.name, ...vals });
      setOpen(null); setVals({}); setErr("");
    } catch (ex) { setErr(ex.message); }
  };

  return (
    <div className="page dash">
      <PageHeader kicker="Brokers · PAPER vs LIVE" title="Broker connections" sub="Paper desk is fully working. Live adapters are real interfaces — secrets stay out of git and (in production) out of the browser. Anything unconfigured shows NOT CONNECTED, never fake fills." />
      {mode === "live" && <div className="error">LIVE mode is armed. Live orders route only through connected, verified adapters. Paper fills are labeled PAPER.</div>}
      <div className="broker-grid">
        {brokers.map((b) => {
          const st = brokerDisplayStatus(b);
          return (
            <div key={b.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 17 }}>{b.name}</h3>
                <span className={`badge ${st.cls}`}>{st.label}</span>
              </div>
              <div className="mono faint" style={{ fontSize: 12 }}>{b.accountId} · {b.environment || "PAPER"} · {(b.balance || 0).toLocaleString()} {b.currency}</div>
              <div className="faint" style={{ fontSize: 12 }}>Last sync {b.lastSync ? new Date(b.lastSync).toLocaleTimeString() : "—"}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveBrokerId(b.id)} disabled={activeBrokerId === b.id}>{activeBrokerId === b.id ? "Active" : "Use"}</button>
                {b.id !== "paper" && <button className="btn btn-ghost btn-sm" onClick={() => disconnectBroker(b.id)}>Disconnect</button>}
              </div>
            </div>
          );
        })}
      </div>
      <h3 style={{ marginTop: 20 }}>Connect</h3>
      <div className="broker-grid">
        {BROKER_CATALOG.filter((c) => c.type !== "paper").map((c) => {
          const live = LIVE_BROKERS.find((x) => x.type === c.type);
          return (
            <div key={c.type} className="card">
              <h3 style={{ fontSize: 16 }}>{c.name}</h3>
              <p className="muted" style={{ fontSize: 13 }}>{c.blurb}</p>
              <div className="faint" style={{ fontSize: 12 }}>{live?.status === "placeholder" ? "PLACEHOLDER — needs bridge service" : "Adapter interface ready · NOT CONNECTED until you add keys"}</div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => { setOpen(c.type); setErr(""); }}>Configure</button>
            </div>
          );
        })}
      </div>
      {open && (
        <div className="modal-back" onClick={() => setOpen(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Connect {BROKER_CATALOG.find((c) => c.type === open)?.name}</h3>
            <p className="muted" style={{ fontSize: 12 }}>Demo stores masked values locally. Production must use a server-side vault — never commit keys.</p>
            {(BROKER_CATALOG.find((c) => c.type === open)?.fields || []).map((f) => (
              <div key={f.key} className="field">
                <label>{f.label}</label>
                {f.type === "select" ? (
                  <select value={vals[f.key] || f.options[0]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.secret ? "password" : "text"} placeholder={f.placeholder} value={vals[f.key] || ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
                )}
              </div>
            ))}
            {err && <div className="error">{err}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => submit(BROKER_CATALOG.find((c) => c.type === open))}>Connect (SIMULATED link)</button>
            </div>
            {!!Object.keys(vals).length && <p className="faint mono" style={{ fontSize: 11 }}>Masked: {Object.entries(vals).map(([k, v]) => `${k}=${maskSecret(v)}`).join(" · ")}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
