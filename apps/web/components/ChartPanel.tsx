"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ColorType, CrosshairMode, LineStyle, createChart, type IChartApi, type IPriceLine, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { TIMEFRAMES, formatPrice, type Candle } from "@harsi/shared";
import { packIndicators, swingLevels } from "@harsi/market-data";

export interface ChartSignal {
  id: string;
  createdAt: string;
  side: "buy" | "sell";
  strategyId: string;
  symbol: string;
}

interface Props {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  signals?: ChartSignal[];
  position?: { entry: number; stop: number | null; target: number | null; side: "buy" | "sell" } | null;
  source: string;
  showEma?: boolean;
  showVolume?: boolean;
  onTimeframe?: (timeframe: string) => void;
  onSignal?: (id: string) => void;
}

function spark(values: number[], color: string, histogram = false) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length < 2) return null;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const step = 100 / (values.length - 1);
  if (histogram) {
    return values.map((value, index) => {
      if (!Number.isFinite(value)) return null;
      const height = (Math.abs(value) / (Math.max(...clean.map(Math.abs)) || 1)) * 28;
      const y = value >= 0 ? 36 - height : 36;
      return <rect key={index} x={index * step} y={y} width={Math.max(step * 0.6, 0.4)} height={height} fill={value >= 0 ? "#1f8a5b" : "#c44b55"} />;
    });
  }
  const points = values.map((value, index) => `${index * step},${Number.isFinite(value) ? 64 - ((value - min) / span) * 56 : 32}`).join(" ");
  return <polyline fill="none" stroke={color} strokeWidth="1.4" points={points} />;
}

export function ChartPanel({ symbol, timeframe, candles, signals = [], position, source, showEma = true, showVolume = true, onTimeframe, onSignal }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ema9Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema21Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const lines = useRef<IPriceLine[]>([]);
  const signalsRef = useRef(signals);
  const onSignalRef = useRef(onSignal);
  signalsRef.current = signals;
  onSignalRef.current = onSignal;
  const [ohlc, setOhlc] = useState<Candle | null>(null);
  const [selected, setSelected] = useState<string>("");
  const data = useMemo(() => {
    const seen = new Set<number>();
    return candles.filter((candle) => {
      if (seen.has(candle.time)) return false;
      seen.add(candle.time);
      return true;
    });
  }, [candles]);
  const indicators = useMemo(() => packIndicators(data), [data]);
  const levels = useMemo(() => swingLevels(data), [data]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const chart = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: "#101318" }, textColor: "#a3a79f", fontFamily: "IBM Plex Mono, ui-monospace, monospace" },
      grid: { vertLines: { color: "#1c2129" }, horzLines: { color: "#1c2129" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#2a303a" },
      timeScale: { borderColor: "#2a303a", timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale: true,
    });
    const series = chart.addCandlestickSeries({
      upColor: "#1f8a5b",
      downColor: "#c44b55",
      borderVisible: false,
      wickUpColor: "#1f8a5b",
      wickDownColor: "#c44b55",
    });
    const volume = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "vol" });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
    const ema9 = chart.addLineSeries({ color: "#d7b56a", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const ema21 = chart.addLineSeries({ color: "#9eb0cc", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    chartRef.current = chart;
    candleRef.current = series;
    volumeRef.current = volume;
    ema9Ref.current = ema9;
    ema21Ref.current = ema21;
    const resize = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth, height: el.clientHeight }));
    resize.observe(el);
    chart.subscribeCrosshairMove((param) => {
      const bar = param.seriesData.get(series) as Candle | undefined;
      if (bar && "open" in bar) setOhlc(bar);
    });
    chart.subscribeClick((param) => {
      if (!param.time || !onSignalRef.current) return;
      const time = Number(param.time);
      const hit = signalsRef.current.find((signal) => Math.abs(Math.floor(new Date(signal.createdAt).getTime() / 1000) - time) < 60 * 30);
      if (hit) onSignalRef.current?.(hit.id);
    });
    return () => {
      resize.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = candleRef.current;
    if (!series || !data.length) return;
    const bucket = data.length > 2 ? data[1].time - data[0].time : 60;
    series.setData(data.map((candle) => ({ ...candle, time: candle.time as UTCTimestamp })));
    volumeRef.current?.setData(showVolume ? data.map((candle) => ({ time: candle.time as UTCTimestamp, value: candle.volume, color: candle.close >= candle.open ? "rgba(31,138,91,.35)" : "rgba(196,75,85,.35)" })) : []);
    const line = (values: number[]) => data.map((candle, index) => ({ time: candle.time as UTCTimestamp, value: values[index] })).filter((point) => Number.isFinite(point.value));
    ema9Ref.current?.setData(showEma ? line(indicators.ema9) : []);
    ema21Ref.current?.setData(showEma ? line(indicators.ema21) : []);
    const times = new Set(data.map((candle) => candle.time));
    series.setMarkers(
      signals.flatMap((signal) => {
        const raw = Math.floor(new Date(signal.createdAt).getTime() / 1000);
        const time = [...times].find((value) => Math.abs(value - raw) <= bucket) ?? null;
        if (time == null || signal.symbol !== symbol) return [];
        return [{
          time: time as UTCTimestamp,
          position: signal.side === "buy" ? "belowBar" as const : "aboveBar" as const,
          color: signal.side === "buy" ? "#b7ebcf" : "#ffd0d3",
          shape: signal.side === "buy" ? "arrowUp" as const : "arrowDown" as const,
          text: signal.strategyId === "london-harsi" ? "HARSI" : signal.strategyId === "pulse-confluence" ? "PULSE" : "BRK",
        }];
      })
    );
    lines.current.forEach((lineItem) => series.removePriceLine(lineItem));
    lines.current = [];
    const add = (price: number, color: string, title: string, style = LineStyle.Dashed) => {
      lines.current.push(series.createPriceLine({ price, color, title, lineWidth: 1, lineStyle: style, axisLabelVisible: true }));
    };
    levels.support.forEach((price) => add(price, "#6f756e", "Support"));
    levels.resistance.forEach((price) => add(price, "#6f756e", "Resistance"));
    if (position?.stop) add(position.stop, "#c44b55", "Stop", LineStyle.Solid);
    if (position?.target) add(position.target, "#1f8a5b", "Target", LineStyle.Solid);
    if (position) add(position.entry, "#d7b56a", "Entry", LineStyle.Dotted);
    setOhlc(data[data.length - 1] ?? null);
    setSelected("");
  }, [data, indicators, levels, position, showEma, showVolume, signals, symbol]);

  return (
    <div className="card chart-card" data-testid="chart">
      <div className="pad" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="row">
            <strong>{symbol}</strong>
            <span className={`badge ${source === "binance-public" ? "ok" : "sim"}`}>{source === "binance-public" ? "Binance public" : "Simulated"}</span>
          </div>
          <div className="ohlc">
            <span>O {ohlc ? formatPrice(symbol, ohlc.open) : "—"}</span>
            <span>H {ohlc ? formatPrice(symbol, ohlc.high) : "—"}</span>
            <span>L {ohlc ? formatPrice(symbol, ohlc.low) : "—"}</span>
            <span>C {ohlc ? formatPrice(symbol, ohlc.close) : "—"}</span>
          </div>
        </div>
        <div className="chart-tools">
          {TIMEFRAMES.map((item) => (
            <button key={item.id} className={`btn ${item.id === timeframe ? "active" : ""}`} onClick={() => onTimeframe?.(item.id)} type="button">{item.label}</button>
          ))}
        </div>
      </div>
      <div ref={host} className="chart-box" />
      <div className="pad ind">
        <div><span className="label">RSI 14</span>{spark(indicators.rsi, "#d7b56a") && <svg viewBox="0 0 100 72">{spark(indicators.rsi, "#d7b56a")}</svg>}</div>
        <div><span className="label">MACD</span><svg viewBox="0 0 100 72">{spark(indicators.macd.hist, "#9eb0cc", true)}</svg></div>
        <div><span className="label">ATR 14</span>{spark(indicators.atr, "#a3a79f") && <svg viewBox="0 0 100 72">{spark(indicators.atr, "#a3a79f")}</svg>}</div>
      </div>
      {selected ? null : null}
    </div>
  );
}
