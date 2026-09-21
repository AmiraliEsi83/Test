import React, { useEffect, useMemo, useRef, useState } from "react";
import { rsi } from "../../lib/instruments-helpers";
import { formatPrice } from "../../lib/instruments";

function emaArr(values, period) {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out = [values[0]];
  for (let i = 1; i < values.length; i += 1) out.push(values[i] * k + out[i - 1] * (1 - k));
  return out;
}

export default function ProChart({ candles, signals, positions, harsi, symbol, height = 460, show }) {
  const ref = useRef(null);
  const [view, setView] = useState({ count: 120, end: null });
  const [hover, setHover] = useState(null);
  const drag = useRef(null);
  const opts = { showEma: true, showRsi: true, showSessions: true, showSr: true, ...(show || {}) };

  const data = useMemo(() => {
    if (!candles?.length) return { vis: [], e9: [], e21: [], rsi: [], hi: null, lo: null };
    const end = view.end ?? candles.length;
    const start = Math.max(0, end - view.count);
    const vis = candles.slice(start, end);
    const closes = candles.map((c) => c.close);
    const e9 = emaArr(closes, 9).slice(start, end);
    const e21 = emaArr(closes, 21).slice(start, end);
    const r = rsi(closes, 14).slice(start, end);
    const hi = Math.max(...vis.map((c) => c.high));
    const lo = Math.min(...vis.map((c) => c.low));
    return { vis, e9, e21, rsi: r, hi, lo, start };
  }, [candles, view]);

  useEffect(() => { setView((v) => ({ ...v, end: null })); }, [symbol]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth;
    const h = height;
    cv.width = w * dpr;
    cv.height = h * dpr;
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const padR = 64;
    const padB = 54;
    const padT = 12;
    const mainH = (h - padB - padT) * (opts.showRsi ? 0.72 : 0.86);
    const { vis, e9, e21, rsi: rs, hi, lo } = data;
    if (!vis.length) {
      ctx.fillStyle = "#8d97ab";
      ctx.font = "12px sans-serif";
      ctx.fillText("Waiting for market data…", 16, 30);
      return;
    }
    const range = Math.max(1e-9, hi - lo);
    const cw = (w - padR) / vis.length;
    const y = (p) => padT + (1 - (p - lo) / range) * mainH;
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.fillStyle = "#5d677a";
    ctx.font = "10px IBM Plex Mono, monospace";
    for (let g = 0; g <= 5; g += 1) {
      const p = lo + (range * g) / 5;
      const yy = y(p);
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
      ctx.fillText(formatPrice(symbol, p), w - padR + 6, yy + 3);
    }
    if (opts.showSessions) {
      ctx.fillStyle = "rgba(124,108,255,0.06)";
      vis.forEach((c, i) => {
        const hour = new Date(c.time * 1000).getUTCHours();
        if (hour < 7) ctx.fillRect(i * cw, padT, cw, mainH);
      });
      ctx.fillStyle = "rgba(240,195,106,0.07)";
      vis.forEach((c, i) => {
        const d = new Date(c.time * 1000);
        if (d.getUTCMinutes() >= 45 && d.getUTCHours() === 7) ctx.fillRect(i * cw, padT, cw, mainH);
      });
    }
    vis.forEach((c, i) => {
      const x = i * cw + cw / 2;
      const up = c.close >= c.open;
      ctx.strokeStyle = up ? "#3dcfb0" : "#f07178";
      ctx.fillStyle = up ? "#3dcfb0" : "#f07178";
      ctx.beginPath(); ctx.moveTo(x, y(c.high)); ctx.lineTo(x, y(c.low)); ctx.stroke();
      const bw = Math.max(1, cw * 0.62);
      const yO = y(c.open); const yC = y(c.close);
      ctx.fillRect(x - bw / 2, Math.min(yO, yC), bw, Math.max(1, Math.abs(yC - yO)));
      if (opts.showEma && e9[i] != null) {
        ctx.fillStyle = "#7aa2ff";
        if (i > 0) {
          ctx.strokeStyle = "#7aa2ff"; ctx.lineWidth = 1.2; ctx.beginPath();
          ctx.moveTo((i - 1) * cw + cw / 2, y(e9[i - 1])); ctx.lineTo(x, y(e9[i])); ctx.stroke();
        }
        ctx.strokeStyle = "#e4c07a"; ctx.beginPath();
        if (i > 0) { ctx.moveTo((i - 1) * cw + cw / 2, y(e21[i - 1])); ctx.lineTo(x, y(e21[i])); ctx.stroke(); }
        ctx.lineWidth = 1;
      }
    });
    if (opts.showSr) {
      const swingHi = Math.max(...vis.slice(-40).map((c) => c.high));
      const swingLo = Math.min(...vis.slice(-40).map((c) => c.low));
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(240,113,120,0.5)";
      ctx.beginPath(); ctx.moveTo(0, y(swingHi)); ctx.lineTo(w - padR, y(swingHi)); ctx.stroke();
      ctx.strokeStyle = "rgba(61,207,176,0.5)";
      ctx.beginPath(); ctx.moveTo(0, y(swingLo)); ctx.lineTo(w - padR, y(swingLo)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#8d97ab";
      ctx.fillText("R", 4, y(swingHi) - 4);
      ctx.fillText("S", 4, y(swingLo) + 12);
    }
    if (harsi?.mid != null) {
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#e4c07a";
      ctx.beginPath(); ctx.moveTo(0, y(harsi.mid)); ctx.lineTo(w - padR, y(harsi.mid)); ctx.stroke();
      ctx.setLineDash([]);
    }
    (signals || []).forEach((s) => {
      const idx = vis.findIndex((c) => Math.abs(c.time - Math.floor((s.ts || Date.now()) / 1000 / 60) * 60) < 180);
      if (idx < 0) return;
      const x = idx * cw + cw / 2;
      const isBuy = s.side === "buy";
      ctx.fillStyle = isBuy ? "#3dcfb0" : "#f07178";
      const yy = isBuy ? y(vis[idx].low) + 14 : y(vis[idx].high) - 14;
      ctx.beginPath();
      if (isBuy) { ctx.moveTo(x, yy); ctx.lineTo(x - 5, yy + 8); ctx.lineTo(x + 5, yy + 8); }
      else { ctx.moveTo(x, yy); ctx.lineTo(x - 5, yy - 8); ctx.lineTo(x + 5, yy - 8); }
      ctx.fill();
      ctx.font = "9px sans-serif";
      ctx.fillText(s.algorithm === "london-harsi" ? "H" : s.algorithm === "pulse-confluence" ? "P" : "B", x - 3, isBuy ? yy + 18 : yy - 12);
    });
    (positions || []).filter((p) => p.status === "open").forEach((p) => {
      const draw = (px, color, label) => {
        if (px == null || px < lo || px > hi) return;
        ctx.strokeStyle = color; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(0, y(px)); ctx.lineTo(w - padR, y(px)); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = color; ctx.font = "9px sans-serif";
        ctx.fillText(label, 4, y(px) - 3);
      };
      draw(p.entry, "#eef3fb", `E ${formatPrice(symbol, p.entry)}`);
      draw(p.sl, "#f07178", "SL");
      draw(p.tp, "#3dcfb0", "TP");
    });
    const volTop = padT + mainH + 8;
    const volH = (h - padB - volTop) * (opts.showRsi ? 0.38 : 0.9);
    const maxV = Math.max(1, ...vis.map((c) => c.volume || 0));
    vis.forEach((c, i) => {
      ctx.fillStyle = c.close >= c.open ? "rgba(61,207,176,0.4)" : "rgba(240,113,120,0.4)";
      const vh = ((c.volume || 0) / maxV) * volH;
      ctx.fillRect(i * cw + 1, volTop + volH - vh, Math.max(1, cw - 2), vh);
    });
    if (opts.showRsi) {
      const rsiTop = volTop + volH + 8;
      const rsiH = h - padB - rsiTop;
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.strokeRect(0.5, rsiTop + 0.5, w - padR - 1, rsiH - 1);
      const ry = (v) => rsiTop + (1 - v / 100) * rsiH;
      ctx.strokeStyle = "rgba(240,113,120,0.4)";
      ctx.beginPath(); ctx.moveTo(0, ry(70)); ctx.lineTo(w - padR, ry(70)); ctx.stroke();
      ctx.strokeStyle = "rgba(61,207,176,0.4)";
      ctx.beginPath(); ctx.moveTo(0, ry(30)); ctx.lineTo(w - padR, ry(30)); ctx.stroke();
      ctx.strokeStyle = "#a78bfa"; ctx.beginPath();
      rs.forEach((v, i) => {
        const x = i * cw + cw / 2;
        if (i === 0) ctx.moveTo(x, ry(v)); else ctx.lineTo(x, ry(v));
      });
      ctx.stroke();
      ctx.fillStyle = "#5d677a";
      ctx.fillText("RSI 14", 4, rsiTop + 11);
    }
    if (hover && vis[hover.i]) {
      const c = vis[hover.i];
      const x = hover.i * cw + cw / 2;
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, h - padB); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, hover.y); ctx.lineTo(w - padR, hover.y); ctx.stroke();
      ctx.fillStyle = "#0c0f16";
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      const label = `O ${formatPrice(symbol, c.open)} H ${formatPrice(symbol, c.high)} L ${formatPrice(symbol, c.low)} C ${formatPrice(symbol, c.close)}`;
      ctx.fillRect(8, 6, ctx.measureText(label).width + 16, 20);
      ctx.strokeRect(8, 6, ctx.measureText(label).width + 16, 20);
      ctx.fillStyle = "#eef3fb";
      ctx.fillText(label, 16, 20);
    }
  });

  const onWheel = (e) => {
    e.preventDefault();
    setView((v) => ({ ...v, count: Math.min(300, Math.max(30, v.count + (e.deltaY > 0 ? 10 : -10))) }));
  };
  const onMouseDown = (e) => {
    drag.current = { x: e.clientX, end: view.end ?? candles.length };
  };
  const onMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const cw = (rect.width - 64) / data.vis.length;
    const i = Math.max(0, Math.min(data.vis.length - 1, Math.floor(x / cw)));
    setHover({ i, y: e.clientY - rect.top });
    if (drag.current) {
      const dx = Math.round((e.clientX - drag.current.x) / 10);
      setView((v) => ({ ...v, end: Math.max(30, Math.min(candles.length, drag.current.end - dx)) }));
    }
  };
  const onMouseUp = () => { drag.current = null; };

  const last = data.vis[data.vis.length - 1];
  return (
    <div>
      <div className="mono faint" style={{ fontSize: 11, padding: "6px 10px" }}>
        {last ? `O ${formatPrice(symbol, last.open)}  H ${formatPrice(symbol, last.high)}  L ${formatPrice(symbol, last.low)}  C ${formatPrice(symbol, last.close)}  Vol ${last.volume}` : "—"} · scroll to zoom · drag to pan
      </div>
      <canvas ref={ref} data-testid="pro-chart" style={{ width: "100%", height, cursor: "crosshair", display: "block" }} onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={() => { setHover(null); drag.current = null; }} />
    </div>
  );
}
