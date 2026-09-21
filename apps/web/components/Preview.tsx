"use client";

import { useMemo } from "react";
import { resample, buildSimulatedTape } from "@harsi/market-data";
import { ChartPanel } from "./ChartPanel";

export function Preview() {
  const candles = useMemo(() => resample(buildSimulatedTape("EURUSD", Date.parse("2026-03-12T12:00:00Z"), 4), 5).slice(-160), []);
  return (
    <div style={{ flex: 1.15, minWidth: 0 }}>
      <ChartPanel symbol="EURUSD" timeframe="5m" candles={candles} source="simulated" />
      <p className="faint" style={{ marginTop: 8 }}>Simulated preview. Not a live brokerage feed.</p>
    </div>
  );
}
