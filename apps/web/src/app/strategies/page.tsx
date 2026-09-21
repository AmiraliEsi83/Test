"use client";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function StrategiesPage() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const load = () => api<any>("/api/strategies").then(setData);
  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, []);
  return (
    <Shell>
      <h2>Strategy Center</h2>
      <p className="muted">Enable/disable modules. Parameters are stored per account. Signals explain the checks that fired.</p>
      {msg && <div className="err">{msg}</div>}
      <div className="grid-3" style={{ marginTop: 16 }}>
        {data?.strategies?.map((s: any) => (
          <article className="card" key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="badge badge-gold">{s.badge}</div>
              <span className={s.enabled ? "badge badge-teal" : "badge"}>{s.enabled ? "active" : "inactive"}</span>
            </div>
            <h3>{s.name}</h3>
            <p>{s.summary}</p>
            <p className="muted">Symbols: {(s.config.symbols || []).join(", ")} · {s.config.timeframe}</p>
            <p className="muted">Recent signals: {s.recent?.length || 0}</p>
            <button
              className="btn btn-sm"
              onClick={async () => {
                await api(`/api/strategies/${s.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ enabled: !s.enabled, config: s.config }),
                });
                await load();
              }}
            >
              {s.enabled ? "Disable" : "Enable"}
            </button>
            <details style={{ marginTop: 12 }}>
              <summary>Rules & settings</summary>
              <ul className="muted">
                {s.rules.map((r: string) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <pre className="mono" style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(s.config, null, 2)}
              </pre>
            </details>
          </article>
        ))}
      </div>
      <p className="disclaimer">Strategy outputs are research signals, not guarantees.</p>
    </Shell>
  );
}
