"use client";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export default function BrokersPage() {
  const [data, setData] = useState<any>(null);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [type, setType] = useState("oanda");
  const [msg, setMsg] = useState("");
  const load = () => api<any>("/api/brokers").then(setData);
  useEffect(() => { load(); }, []);
  const spec = data?.catalog?.find((b: any) => b.type === type);
  return (
    <Shell>
      <h2>Brokers</h2>
      <p className="muted">Secrets are stored encrypted on the server. Failed connections stay NOT CONNECTED — live fills are never faked.</p>
      <div className="grid-3">
        {data?.connections?.map((c: any) => (
          <article className="card" key={c.id}>
            <h3>{c.name}</h3>
            <div className={c.status === "connected" ? "badge badge-teal" : "badge badge-warn"}>
              {c.status === "connected" ? "CONNECTED" : "NOT CONNECTED"}
            </div>
            <p>Env: {c.environment}</p>
            <p>Account: {c.accountId || "—"}</p>
            <p>Last sync: {c.lastSync ? new Date(c.lastSync).toLocaleString() : "—"}</p>
            {c.error && <p className="err">{c.error}</p>}
          </article>
        ))}
      </div>
      <article className="card" style={{ marginTop: 16 }}>
        <h3>Connect (Pro)</h3>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {data?.catalog?.filter((b: any) => b.type !== "paper").map((b: any) => (
            <option key={b.type} value={b.type}>{b.name}</option>
          ))}
        </select>
        {spec?.fields?.map((f: any) => (
          <div key={f.key}>
            <label>{f.label}</label>
            {f.type === "select" ? (
              <select onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })}>
                {(f.options || []).map((o: string) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.secret ? "password" : "text"} onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })} />
            )}
          </div>
        ))}
        <button
          className="btn btn-primary"
          style={{ marginTop: 12 }}
          onClick={async () => {
            setMsg("");
            try {
              const res = await api<any>("/api/brokers", { method: "POST", body: JSON.stringify({ type, credentials: creds }) });
              setMsg(res.status || "saved");
              load();
            } catch (e) {
              setMsg((e as Error).message);
            }
          }}
        >
          Connect
        </button>
        {msg && <p>{msg}</p>}
      </article>
    </Shell>
  );
}
