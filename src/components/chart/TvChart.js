import React, { useEffect, useRef } from "react";
import { INSTRUMENTS } from "../../lib/instruments";

export default function TvChart({ symbol }) {
  const ref = useRef(null);
  const tv = INSTRUMENTS[symbol]?.tv || "FX:EURUSD";

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    node.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tv,
      interval: "5",
      timezone: "Europe/London",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "#10151e",
      gridColor: "rgba(255,255,255,0.06)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    node.appendChild(script);
    return () => {
      node.innerHTML = "";
    };
  }, [tv]);

  return (
    <div className="tv-holder">
      <div className="tradingview-widget-container" style={{ height: "100%" }}>
        <div
          className="tradingview-widget-container__widget"
          ref={ref}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
