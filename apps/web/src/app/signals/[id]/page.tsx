"use client";
import { Shell } from "@/components/Shell";
import { api, money } from "@/lib/api";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function SignalDetail() {
  const { id } = useParams<{ id: string }>();
  const [s, setS] = useState<any>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api(`/api/signals/${id}`).then(setS).catch((e) => setMsg(e.message));
  }, [id]);
  if (!s) return <Shell>{msg || "Loading…"}</Shell>;
  return (
    <Shell>
      <div className="badge">{s.strategyId}</div>
      <h2>
        {s.side.toUpperCase()} {s.symbol} · {s.timeframe}
      </h2>
      <p>{s.reason}</p>
      <div className="grid-2">
        <article className="card">
          <h3>Levels</h3>
          <div className="cond"><span>Entry</span><b className="mono">{s.entry}</b></div>
          <div className="cond"><span>Stop</span><b className="mono">{s.stop}</b></div>
          <div className="cond"><span>Target</span><b className="mono">{s.target}</b></div>
          <div className="cond"><span>R:R</span><b className="mono">{Number(s.riskReward).toFixed(2)}</b></div>
          <div className="cond"><span>Mark</span><b className="mono">{s.currentPrice}</b></div>
          <div className="cond"><span>Time</span><b>{new Date(s.createdAt).toLocaleString()}</b></div>
        </article>
        <article className="card">
          <h3>Conditions that triggered</h3>
          {(s.conditions || []).map((c: any) => (
            <div className="cond" key={c.label}>
              <span>{c.label} · {c.detail}</span>
              <span className={c.passed ? "check" : "cross"}>{c.passed ? "✓" : "✗"}</span>
            </div>
          ))}
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={async () => {
              try {
                await api("/api/orders", {
                  method: "POST",
                  body: JSON.stringify({
                    symbol: s.symbol,
                    side: s.side,
                    type: "market",
                    lots: 0.1,
                    stop: s.stop,
                    target: s.target,
                    strategyId: s.strategyId,
                    mode: "paper",
                  }),
                });
                setMsg("PAPER order submitted");
              } catch (e) {
                setMsg((e as Error).message);
              }
            }}
          >
            Paper execute
          </button>
          {msg && <p>{msg}</p>}
        </article>
      </div>
    </Shell>
  );
}
