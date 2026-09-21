import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useTrading } from '../../context/TradingContext';
import { formatPrice, toPips } from '@harsi/shared';
import { ema, rsi, macd, atr, computeHarsi } from '@harsi/market-data';

interface HoverBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const TradingChart: React.FC = () => {
  const { symbol, timeframe, setTimeframe, candles, lastTick, signals, setSelectedSignal } =
    useTrading();

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const asianMidLineRef = useRef<any>(null);
  const asianHighLineRef = useRef<any>(null);
  const asianLowLineRef = useRef<any>(null);

  const [hoverBar, setHoverBar] = useState<HoverBar | null>(null);
  const [showEma, setShowEma] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showAsianRange, setShowAsianRange] = useState<boolean>(true);
  const [showRsiSubplot, setShowRsiSubplot] = useState<boolean>(true);
  const [showMacdSubplot, setShowMacdSubplot] = useState<boolean>(false);

  // Technical calculations
  const indicators = useMemo(() => {
    if (!candles.length) return null;
    const closes = candles.map((c) => c.close);
    const e9 = ema(closes, 9);
    const e21 = ema(closes, 21);
    const r = rsi(closes, 14);
    const m = macd(closes, 12, 26, 9);
    const a = atr(candles, 14);

    // Asian range estimation
    const sessionSlice = candles.slice(-50);
    const asianHigh = Math.max(...sessionSlice.map((c) => c.high));
    const asianLow = Math.min(...sessionSlice.map((c) => c.low));
    const asianMid = (asianHigh + asianLow) / 2;

    const lastPrice = candles[candles.length - 1].close;
    const harsiInfo = computeHarsi(symbol, lastPrice, { high: asianHigh, low: asianLow });

    return {
      e9,
      e21,
      rsi: r,
      macd: m,
      atr: a,
      asianHigh,
      asianLow,
      asianMid,
      harsi: harsiInfo,
    };
  }, [candles, symbol]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0d111a' },
        textColor: '#94a3b8',
        fontFamily: "'JetBrains Mono', 'Inter', monospace",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#475569', width: 1, style: 2 },
        horzLine: { color: '#475569', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#1e2638',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#1e2638',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 480,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    const ema9Series = chart.addLineSeries({
      color: '#06b6d4',
      lineWidth: 1,
      title: 'EMA 9',
    });

    const ema21Series = chart.addLineSeries({
      color: '#818cf8',
      lineWidth: 1,
      title: 'EMA 21',
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData.has(candleSeries)) {
        setHoverBar(null);
        return;
      }
      const data = param.seriesData.get(candleSeries) as any;
      if (data) {
        setHoverBar({
          time: param.time as number,
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: 0,
        });
      }
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    ema9SeriesRef.current = ema9Series;
    ema21SeriesRef.current = ema21Series;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !candles.length) return;

    candleSeriesRef.current.setData(
      candles.map((c) => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    if (volumeSeriesRef.current && showVolume) {
      volumeSeriesRef.current.setData(
        candles.map((c) => ({
          time: c.time as any,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)',
        }))
      );
    }

    if (indicators) {
      if (ema9SeriesRef.current) {
        if (showEma) {
          ema9SeriesRef.current.setData(
            candles.map((c, i) => ({ time: c.time as any, value: indicators.e9[i] }))
          );
        } else {
          ema9SeriesRef.current.setData([]);
        }
      }

      if (ema21SeriesRef.current) {
        if (showEma) {
          ema21SeriesRef.current.setData(
            candles.map((c, i) => ({ time: c.time as any, value: indicators.e21[i] }))
          );
        } else {
          ema21SeriesRef.current.setData([]);
        }
      }

      // Asian range horizontal price lines
      if (showAsianRange && candleSeriesRef.current) {
        try {
          if (asianMidLineRef.current) candleSeriesRef.current.removePriceLine(asianMidLineRef.current);
          if (asianHighLineRef.current) candleSeriesRef.current.removePriceLine(asianHighLineRef.current);
          if (asianLowLineRef.current) candleSeriesRef.current.removePriceLine(asianLowLineRef.current);

          asianMidLineRef.current = candleSeriesRef.current.createPriceLine({
            price: indicators.asianMid,
            color: '#38bdf8',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'ASIAN MID',
          });

          asianHighLineRef.current = candleSeriesRef.current.createPriceLine({
            price: indicators.asianHigh,
            color: 'rgba(244, 63, 94, 0.6)',
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: true,
            title: 'ASIAN HIGH',
          });

          asianLowLineRef.current = candleSeriesRef.current.createPriceLine({
            price: indicators.asianLow,
            color: 'rgba(16, 185, 129, 0.6)',
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: true,
            title: 'ASIAN LOW',
          });
        } catch (e) {
          // ignore
        }
      }
    }
  }, [candles, indicators, showEma, showVolume, showAsianRange]);

  // Set markers for Signals
  useEffect(() => {
    if (!candleSeriesRef.current || !candles.length) return;

    const symbolSignals = signals.filter((s) => s.symbol === symbol).slice(0, 15);
    const markers = symbolSignals.map((sig) => {
      const sigTimeSec = Math.floor(sig.timestamp / 1000 / 60) * 60;
      return {
        time: sigTimeSec as any,
        position: sig.side === 'BUY' ? 'belowBar' : 'aboveBar',
        color: sig.side === 'BUY' ? '#10b981' : '#f43f5e',
        shape: sig.side === 'BUY' ? 'arrowUp' : 'arrowDown',
        text: sig.strategyId === 'london-harsi' ? 'HARSI' : sig.strategyId === 'breakout-trend' ? 'BRK' : 'PULSE',
        id: sig.id,
      };
    });

    try {
      candleSeriesRef.current.setMarkers(markers as any);
    } catch (e) {
      // ignore
    }
  }, [signals, symbol, candles]);

  const activeBar = hoverBar || (candles.length ? candles[candles.length - 1] : null);
  const lastPrice = lastTick?.price || (candles.length ? candles[candles.length - 1].close : 0);

  return (
    <div className="terminal-card overflow-hidden flex flex-col">
      {/* Top Chart Toolbar */}
      <div className="px-4 py-2.5 border-b border-[#1e2638] bg-[#0e131d] flex flex-wrap items-center justify-between gap-3">
        {/* Symbol & Price Display */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base tracking-wide">{symbol}</span>
            <span className="badge-paper text-[10px] uppercase">SIMULATED FEED</span>
          </div>

          <div className="font-mono font-bold text-base text-white">
            {formatPrice(symbol, lastPrice)}
          </div>

          {lastTick && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#94a3b8]">
              <span>Bid: {formatPrice(symbol, lastTick.bid)}</span>
              <span>Ask: {formatPrice(symbol, lastTick.ask)}</span>
              <span className="text-emerald-400">Spread: {toPips(symbol, lastTick.ask - lastTick.bid)} pips</span>
            </div>
          )}
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-[#141a27] p-1 rounded-md border border-[#1e2638]">
          {['1m', '5m', '15m', '1h', '4h', '1D'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition ${
                timeframe === tf
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Indicator Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEma(!showEma)}
            className={`px-2 py-1 text-xs rounded border transition ${
              showEma
                ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                : 'bg-[#141a27] text-slate-400 border-[#1e2638]'
            }`}
          >
            EMA 9/21
          </button>
          <button
            onClick={() => setShowAsianRange(!showAsianRange)}
            className={`px-2 py-1 text-xs rounded border transition ${
              showAsianRange
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : 'bg-[#141a27] text-slate-400 border-[#1e2638]'
            }`}
          >
            Asian Mid
          </button>
          <button
            onClick={() => setShowRsiSubplot(!showRsiSubplot)}
            className={`px-2 py-1 text-xs rounded border transition ${
              showRsiSubplot
                ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                : 'bg-[#141a27] text-slate-400 border-[#1e2638]'
            }`}
          >
            RSI
          </button>
        </div>
      </div>

      {/* OHLC Bar Inspector Banner */}
      {activeBar && (
        <div className="px-4 py-1.5 bg-[#0b0f17] border-b border-[#171e2c] flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
          <div>
            <span className="text-slate-500">O:</span>{' '}
            <span className="text-white">{formatPrice(symbol, activeBar.open)}</span>
          </div>
          <div>
            <span className="text-slate-500">H:</span>{' '}
            <span className="text-emerald-400">{formatPrice(symbol, activeBar.high)}</span>
          </div>
          <div>
            <span className="text-slate-500">L:</span>{' '}
            <span className="text-rose-400">{formatPrice(symbol, activeBar.low)}</span>
          </div>
          <div>
            <span className="text-slate-500">C:</span>{' '}
            <span className="text-white">{formatPrice(symbol, activeBar.close)}</span>
          </div>
          {indicators?.harsi && (
            <div className="text-cyan-400 font-semibold">
              HARSI: {indicators.harsi.value > 0 ? '+' : ''}
              {indicators.harsi.value.toFixed(1)} pips ({indicators.harsi.zone})
            </div>
          )}
        </div>
      )}

      {/* Chart Canvas */}
      <div ref={containerRef} className="w-full relative" />

      {/* RSI Subplot Bar */}
      {showRsiSubplot && indicators && (
        <div className="px-4 py-2 border-t border-[#1e2638] bg-[#0b0e15] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-indigo-400 font-bold">RSI (14):</span>
            <span
              className={`font-bold ${
                indicators.rsi[indicators.rsi.length - 1] >= 70
                  ? 'text-rose-400'
                  : indicators.rsi[indicators.rsi.length - 1] <= 30
                  ? 'text-emerald-400'
                  : 'text-slate-200'
              }`}
            >
              {indicators.rsi[indicators.rsi.length - 1]?.toFixed(1)}
            </span>
            <span className="text-slate-500 text-[11px]">(Overbought 70 / Oversold 30)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>ATR (14): {formatPrice(symbol, indicators.atr[indicators.atr.length - 1])}</span>
            <span>
              MACD Hist:{' '}
              {indicators.macd.hist[indicators.macd.hist.length - 1] >= 0 ? '+' : ''}
              {indicators.macd.hist[indicators.macd.hist.length - 1]?.toFixed(5)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
