"use client";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export default function AutomationPage() {
  const [auto, setAuto] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const load = () => api<any>("/api/automation").then((d) => setAuto(d.automation));
  useEffect(() => { load(); }, []);
  if (!auto) return <Shell>Loading…</Shell>;
  const rows = Object.entries(auto) as [string, { alerts: boolean; paper: boolean; live: boolean }][];
  return (
    <Shell>
      <h2>Automation</h2>
      <p className="muted">Live auto-execute never turns on silently. It needs Pro plus an explicit confirmation.</p>
      {rows.map(([k, v]) => (
        <article className="card" key={k} style={{ marginBottom: 10 }}>
          <h3>{k}</h3>
          <label><input type="checkbox" checked={v.alerts} onChange={(e) => setAuto({ ...auto, [k]: { ...v, alerts: e.target.checked } })} /> Alerts</label>
          <label><input type="checkbox" checked={v.paper} onChange={(e) => setAuto({ ...auto, [k]: { ...v, paper: e.target.checked } })} /> Paper auto-execute</label>
          <label><input type="checkbox" checked={v.live} onChange={(e) => setAuto({ ...auto, [k]: { ...v, live: e.target.checked } })} /> Live auto-execute</label>
        </article>
      ))}
      <button
        className="btn btn-primary"
        onClick={async () => {
          try {
            const headers: Record<string, string> = {};
            const liveOn = Object.values(auto).some((v: any) => v.live);
            if (liveOn) {
              const ok = window.confirm("Enable LIVE auto-execute? This can send real orders if a broker is connected.");
              if (!ok) return;
              headers["x-harsi-live-confirm"] = "ENABLE_LIVE_AUTOMATION";
            }
            await api("/api/automation", { method: "PUT", headers, body: JSON.stringify(auto) });
            setMsg("Saved");
          } catch (e) {
            setMsg((e as Error).message);
          }
        }}
      >
        Save automation
      </button>
      <button
        className="btn btn-danger"
        style={{ marginLeft: 8 }}
        onClick={async () => {
          if (!window.confirm("STOP ALL AUTOMATION?")) return;
          await api("/api/automation/stop", { method: "POST" });
          await load();
          setMsg("All automation stopped. Kill switch armed.");
        }}
      >
        STOP ALL AUTOMATION
      </button>
      {msg && <p>{msg}</p>}
    </Shell>
  );
}
