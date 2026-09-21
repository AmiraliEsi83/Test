"use client";
import { useEffect, useRef } from "react";

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
type Marker = { time: number; position: "belowBar" | "aboveBar"; color: string; shape: string; text: string };

export function LiveChart({
  candles,
  asian,
  emaFast,
  emaSlow,
  markers,
}: {
  candles: Candle[];
  asian?: { high: number; low: number };
  emaFast?: { time: number; value: number }[];
  emaSlow?: { time: number; value: number }[];
  markers?: Marker[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;
    let disposed = false;
    let chart: any;
    (async () => {
      const { createChart, ColorType, CrosshairMode } = await import("lightweight-charts");
      if (disposed || !ref.current) return;
      chart = createChart(ref.current, {
        autoSize: true,
        layout: { background: { type: ColorType.Solid, color: "#10151e" }, textColor: "#8d97ab" },
        grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
        timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false },
      });
      const series = chart.addCandlestickSeries({
        upColor: "#3dcfb0",
        downColor: "#f07178",
        borderVisible: false,
        wickUpColor: "#3dcfb0",
        wickDownColor: "#f07178",
      });
      series.setData(candles.map((c) => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close })));
      const vol = chart.addHistogramSeries({
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
        color: "rgba(122,162,255,0.35)",
      });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      vol.setData(candles.map((c) => ({ time: c.time as any, value: c.volume, color: c.close >= c.open ? "rgba(61,207,176,0.35)" : "rgba(240,113,120,0.35)" })));
      if (emaFast?.length) {
        const s = chart.addLineSeries({ color: "#e4c07a", lineWidth: 1 });
        s.setData(emaFast as any);
      }
      if (emaSlow?.length) {
        const s = chart.addLineSeries({ color: "#7aa2ff", lineWidth: 1 });
        s.setData(emaSlow as any);
      }
      if (asian) {
        series.createPriceLine({ price: asian.high, color: "#a78bfa", lineStyle: 2, title: "Asia H" });
        series.createPriceLine({ price: asian.low, color: "#a78bfa", lineStyle: 2, title: "Asia L" });
      }
      if (markers?.length) series.setMarkers(markers as any);
      chart.timeScale().fitContent();
      chartRef.current = { chart, series };
    })();
    return () => {
      disposed = true;
      chart?.remove();
    };
  }, [candles, asian, emaFast, emaSlow, markers]);

  return <div ref={ref} style={{ height: 420, width: "100%" }} />;
}
