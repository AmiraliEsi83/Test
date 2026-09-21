"use client";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [data, setData] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api("/api/settings").then(setData);
    api<any>("/api/risk").then((d) => setRisk(d.risk));
  }, []);
  if (!data || !risk) return <Shell>Loading…</Shell>;
  return (
    <Shell>
      <h2>Settings</h2>
      <div className="grid-2">
        <article className="card">
          <h3>Profile</h3>
          <label>Name</label>
          <input defaultValue={data.profile.name} onChange={(e) => (data.profile.name = e.target.value)} />
          <label>Timezone</label>
          <input defaultValue={data.profile.timezone} onChange={(e) => (data.profile.timezone = e.target.value)} />
          <label>Default market</label>
          <input defaultValue={data.profile.defaultSymbol} onChange={(e) => (data.profile.defaultSymbol = e.target.value)} />
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={async () => {
            await api("/api/settings", { method: "PUT", body: JSON.stringify(data.profile) });
            setMsg("Profile saved");
          }}>Save profile</button>
        </article>
        <article className="card">
          <h3>Risk</h3>
          {["riskPerTradePct", "maxPositionLots", "maxDailyLoss", "maxOpenPositions", "maxExposureByAsset", "stopAfterConsecutiveLosses"].map((k) => (
            <div key={k}>
              <label>{k}</label>
              <input type="number" value={risk[k]} onChange={(e) => setRisk({ ...risk, [k]: Number(e.target.value) })} />
            </div>
          ))}
          <label>
            <input type="checkbox" checked={risk.dailyKillSwitch} onChange={(e) => setRisk({ ...risk, dailyKillSwitch: e.target.checked })} />
            Daily kill switch
          </label>
          <button className="btn" style={{ marginTop: 12 }} onClick={async () => {
            await api("/api/risk", { method: "PUT", body: JSON.stringify(risk) });
            setMsg("Risk saved");
          }}>Save risk</button>
        </article>
      </div>
      <article className="card" style={{ marginTop: 12 }}>
        <h3>Subscription</h3>
        <p>Current: {data.profile.planMeta?.name}</p>
        <p className="muted">Manage on Pricing. Backend enforces plan gates.</p>
      </article>
      {msg && <p>{msg}</p>}
    </Shell>
  );
}
