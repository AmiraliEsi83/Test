import React from "react";
import { useTrading } from "../context/TradingContext";
import { PageHeader, Empty } from "../components/ui";
import { getEconomicEvents } from "../lib/econ";
import { SessionWidget } from "../components/Widgets";

export default function Market() {
  const { session } = useTrading();
  const { configured, events } = getEconomicEvents();
  return (
    <div className="page dash">
      <PageHeader kicker="Market" title="Sessions & calendar" sub="Session state drives HARSI. No economic events are fabricated — connect a provider to populate the calendar." />
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 14 }}>
        <SessionWidget />
        <div className="card">
          <h3>Current state</h3>
          <p><b>{session.name}</b> · {session.note}</p>
          <p className="muted" style={{ fontSize: 13 }}>HARSI window {session.inHarsiWindow ? "ARMED" : "standby"} · volatility ×{session.volatility}</p>
          <h3 style={{ marginTop: 16 }}>Economic calendar</h3>
          {!configured && <Empty title="No calendar provider configured" sub="Set REACT_APP_ECON_PROVIDER to enable. HARSI will pause around major events once a feed exists." />}
          {!!configured && !events.length && <p className="muted">Provider connected — no upcoming high-impact events.</p>}
        </div>
      </div>
    </div>
  );
}
