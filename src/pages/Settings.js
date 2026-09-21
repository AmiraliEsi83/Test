import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTrading } from "../context/TradingContext";
import { PageHeader } from "../components/ui";

export default function Settings() {
  const { user, plan, subscribe } = useAuth();
  const { settings, setSettings, risk, setRisk, watchlist, brokers, activeBrokerId } = useTrading();
  const n = settings.notifications || {};
  const setN = (k, v) => setSettings({ ...settings, notifications: { ...n, [k]: v } });

  return (
    <div className="page dash">
      <PageHeader kicker="Settings" title="Workspace settings" sub={`Signed in as ${user.email} · ${plan.name} plan`} right={<Link to="/pricing" className="btn btn-ghost btn-sm">Change plan</Link>} />
      <div className="grid-3">
        <div className="card">
          <h3>Profile & market</h3>
          <div className="field"><label>Display name</label><input value={user.name} readOnly /></div>
          <div className="field"><label>Timezone</label><input value={settings.timezone || "UTC"} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} /></div>
          <div className="field"><label>Default lots</label><input type="number" step="0.01" value={settings.defaultLots} onChange={(e) => setSettings({ ...settings, defaultLots: Number(e.target.value) })} /></div>
          <div className="field"><label>Risk % per trade</label><input type="number" step="0.1" value={settings.riskPercent} onChange={(e) => setSettings({ ...settings, riskPercent: Number(e.target.value) })} /></div>
          <label className="faint"><input type="checkbox" checked={settings.forceLondonWindow} onChange={(e) => setSettings({ ...settings, forceLondonWindow: e.target.checked })} /> Arm HARSI T-15 demo window</label>
        </div>
        <div className="card">
          <h3>Notifications</h3>
          {[["signal", "New signal"], ["entry", "Entry fills"], ["exit", "Exit fills"], ["stop", "Stop reached"], ["target", "Target reached"], ["broker", "Broker disconnected"], ["risk", "Risk limit reached"]].map(([k, label]) => (
            <label key={k} className="faint" style={{ display: "block", margin: "6px 0" }}><input type="checkbox" checked={n[k] !== false} onChange={(e) => setN(k, e.target.checked)} /> {label}</label>
          ))}
          <label className="faint" style={{ display: "block" }}><input type="checkbox" checked={settings.sound} onChange={(e) => setSettings({ ...settings, sound: e.target.checked })} /> Sound</label>
          <label className="faint" style={{ display: "block" }}><input type="checkbox" checked={settings.desktop} onChange={(e) => setSettings({ ...settings, desktop: e.target.checked })} /> Browser notifications</label>
          <p className="muted" style={{ fontSize: 12 }}>Email + Telegram/webhook ship server-side on Pro. Configure HARSI_WEBHOOK_URL in production.</p>
        </div>
        <div className="card">
          <h3>Trading & risk</h3>
          <div className="field"><label>Max daily loss (USD)</label><input type="number" value={risk.maxDailyLossUsd} onChange={(e) => setRisk({ ...risk, maxDailyLossUsd: Number(e.target.value) })} /></div>
          <div className="field"><label>Max open positions</label><input type="number" value={risk.maxOpenPositions} onChange={(e) => setRisk({ ...risk, maxOpenPositions: Number(e.target.value) })} /></div>
          <div className="field"><label>Kill switch</label><input type="checkbox" checked={!!risk.killSwitch} onChange={(e) => setRisk({ ...risk, killSwitch: e.target.checked })} /></div>
          <div className="faint" style={{ fontSize: 12 }}>Watchlist: {watchlist.join(", ")}</div>
          <div className="faint" style={{ fontSize: 12 }}>Active broker: {(brokers.find((b) => b.id === activeBrokerId) || {}).name}</div>
          <div className="field"><label>Subscription (demo switch — Stripe in production)</label>
            <select value={plan.id} onChange={(e) => subscribe(e.target.value)}>
              <option value="free">Free</option>
              <option value="trader">Trader</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
