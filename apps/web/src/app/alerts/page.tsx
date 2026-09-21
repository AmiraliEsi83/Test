"use client";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export default function AlertsPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api("/api/alerts").then(setData);
  }, []);
  return (
    <Shell>
      <h2>Alerts</h2>
      <p className="muted">Channels: browser now, email/webhook later. Preferences are stored per event.</p>
      <button className="btn btn-sm" onClick={async () => { await api("/api/alerts/read", { method: "POST" }); api("/api/alerts").then(setData); }}>Mark read</button>
      <button
        className="btn btn-sm"
        style={{ marginLeft: 8 }}
        onClick={() => Notification.requestPermission()}
      >
        Enable browser notifications
      </button>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <article className="card">
          <h3>Feed</h3>
          {data?.alerts?.map((a: any) => (
            <div className="cond" key={a.id}>
              <span>
                {a.locked && <span className="badge">LOCKED</span>} {a.title}
                <div className="muted">{a.message}</div>
              </span>
              <span className="mono">{new Date(a.createdAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </article>
        <article className="card">
          <h3>Preferences</h3>
          {data?.prefs?.map((p: any) => (
            <div className="cond" key={p.id}>
              <span>{p.event}</span>
              <span>browser {p.browser ? "on" : "off"} · email {p.email ? "arch" : "off"} · webhook {p.webhook ? "arch" : "off"}</span>
            </div>
          ))}
        </article>
      </div>
    </Shell>
  );
}
