import React from "react";

export function PageHeader({ kicker, title, sub, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
      <div>
        {kicker && <div className="kicker">{kicker}</div>}
        <h2 style={{ fontSize: 32, marginTop: 8 }}>{title}</h2>
        {sub && <p className="muted" style={{ margin: "6px 0 0" }}>{sub}</p>}
      </div>
      {right && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{right}</div>}
    </div>
  );
}

export function Empty({ title, sub, action }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: 32 }}>
      <h3>{title}</h3>
      {sub && <p className="muted">{sub}</p>}
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className="card">
      <div className="faint" style={{ fontSize: 12 }}>{label}</div>
      <div className="big-num" style={{ marginTop: 4 }}>{value}</div>
      {sub && <div className={tone || "muted"} style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function EquityCurve({ points, height = 160 }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth;
    cv.width = w * dpr;
    cv.height = height * dpr;
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, height);
    if (!points?.length) {
      ctx.fillStyle = "#5d677a";
      ctx.font = "12px sans-serif";
      ctx.fillText("No data yet — open paper trades to build a curve.", 12, 24);
      return;
    }
    const vals = points.map((p) => p.eq ?? p.cum ?? 0);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = Math.max(1, max - min);
    const y = (v) => 10 + (1 - (v - min) / range) * (height - 24);
    const x = (i) => (i / Math.max(1, vals.length - 1)) * (w - 8) + 4;
    const up = vals[vals.length - 1] >= vals[0];
    ctx.strokeStyle = up ? "#3dcfb0" : "#f07178";
    ctx.lineWidth = 2;
    ctx.beginPath();
    vals.forEach((v, i) => { if (i === 0) ctx.moveTo(x(i), y(v)); else ctx.lineTo(x(i), y(v)); });
    ctx.stroke();
    ctx.lineTo(x(vals.length - 1), height - 4);
    ctx.lineTo(x(0), height - 4);
    ctx.closePath();
    ctx.fillStyle = up ? "rgba(61,207,176,0.12)" : "rgba(240,113,120,0.12)";
    ctx.fill();
  });
  return <canvas ref={ref} style={{ width: "100%", height, display: "block" }} data-testid="equity-curve" />;
}

export function ChecksList({ checks }) {
  if (!checks?.length) return <p className="muted">No condition detail recorded.</p>;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {checks.map((c, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)" }}>
          <span style={{ fontSize: 13 }}>{c.pass ? "✓" : "✗"} {c.label}</span>
          <span className="mono faint" style={{ fontSize: 12 }}>{c.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ModeBadge({ mode }) {
  return <span className={`badge ${mode === "live" ? "badge-sell" : "badge-teal"}`}>{mode === "live" ? "LIVE" : "PAPER"}</span>;
}

export function SimBadge({ simulated }) {
  if (!simulated) return null;
  return <span className="badge badge-gold" style={{ marginLeft: 6 }}>SIMULATED</span>;
}
