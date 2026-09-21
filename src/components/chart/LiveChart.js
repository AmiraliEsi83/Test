import React, { useEffect, useRef } from "react";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";
import { useTrading } from "../../context/TradingContext";
import { formatPrice } from "../../lib/instruments";

export default function LiveChart() {
  const { candles, lastPrice, symbol, harsi, alerts } = useTrading();
  const wrapRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const volRef = useRef(null);
  const linesRef = useRef([]);

  useEffect(() => {
    if (!wrapRef.current) return undefined;
    const chart = createChart(wrapRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#10151e" },
        textColor: "#8d97ab",
        fontFamily: "IBM Plex Sans",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true },
      width: wrapRef.current.clientWidth,
      height: wrapRef.current.clientHeight || 420,
    });
    const candle = chart.addCandlestickSeries({
      upColor: "#3dcfb0",
      downColor: "#f07178",
      borderUpColor: "#3dcfb0",
      borderDownColor: "#f07178",
      wickUpColor: "#3dcfb0",
      wickDownColor: "#f07178",
    });
    const vol = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    vol.priceScale().applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });
    chartRef.current = chart;
    seriesRef.current = candle;
    volRef.current = vol;
    const ro = new ResizeObserver(() => {
      if (!wrapRef.current) return;
      chart.applyOptions({
        width: wrapRef.current.clientWidth,
        height: wrapRef.current.clientHeight || 420,
      });
    });
    ro.observe(wrapRef.current);
    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !candles.length) return;
    seriesRef.current.setData(
      candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    volRef.current?.setData(
      candles.map((c) => ({
        time: c.time,
        value: c.volume,
        color:
          c.close >= c.open ? "rgba(61,207,176,0.35)" : "rgba(240,113,120,0.35)",
      }))
    );
  }, [candles]);

  useEffect(() => {
    if (!seriesRef.current) return;
    const marks = alerts
      .filter((a) => a.symbol === symbol && (a.type === "harsi" || a.type === "pulse") && !a.locked)
      .slice(0, 24)
      .map((a) => ({
        time: Math.floor(a.ts / 1000 / 60) * 60,
        position: a.side === "buy" ? "belowBar" : "aboveBar",
        color: a.side === "buy" ? "#3dcfb0" : "#f07178",
        shape: a.side === "buy" ? "arrowUp" : "arrowDown",
        text: a.type === "harsi" ? "H" : "P",
      }));
    const uniq = [];
    const seen = new Set();
    marks.forEach((m) => {
      const k = `${m.time}-${m.text}`;
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(m);
      }
    });
    try {
      seriesRef.current.setMarkers(uniq);
    } catch (e) {
      /* marker times must exist on series */
    }
  }, [alerts, symbol]);

  useEffect(() => {
    if (!seriesRef.current || harsi?.mid == null) return;
    linesRef.current.forEach((line) => {
      try {
        seriesRef.current.removePriceLine(line);
      } catch (e) {
        /* series rebuilt */
      }
    });
    linesRef.current = [];
    const add = (opts) => {
      linesRef.current.push(seriesRef.current.createPriceLine(opts));
    };
    add({
      price: harsi.mid,
      color: "#e4c07a",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "Asian mid",
    });
    if (harsi.asianHigh) {
      add({
        price: harsi.asianHigh,
        color: "rgba(240,113,120,0.55)",
        lineWidth: 1,
        lineStyle: 1,
        title: "Asia H",
      });
      add({
        price: harsi.asianLow,
        color: "rgba(61,207,176,0.55)",
        lineWidth: 1,
        lineStyle: 1,
        title: "Asia L",
      });
    }
  }, [harsi?.mid, harsi?.asianHigh, harsi?.asianLow, symbol]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        ref={wrapRef}
        className="live-chart"
        data-testid="live-chart"
        aria-label={`${symbol} live chart ${formatPrice(symbol, lastPrice)}`}
      />
    </div>
  );
}
