import React, { useEffect, useRef } from "react";
import { INSTRUMENTS } from "../../lib/instruments";

export default function TvChart({ symbol }) {
  const ref = useRef(null);
  const tv = INSTRUMENTS[symbol]?.tv || "FX:EURUSD";

  useEffect(() => {
    if (!ref.current) return undefined;
    ref.current.innerHTML = "";
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
    ref.current.appendChild(script);
    return () => {
      if (ref.current) ref.current.innerHTML = "";
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
