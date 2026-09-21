import React from "react";
import { useTrading } from "../context/TradingContext";
import { AUDIT_LABELS } from "../lib/audit";
import { PageHeader, Empty } from "../components/ui";

export default function Activity() {
  const { audit } = useTrading();
  return (
    <div className="page dash">
      <PageHeader kicker="Audit" title={`Activity log (${audit.length})`} sub="Logins, strategy changes, broker events, orders, risk blocks. Essential for debugging automation." />
      {!audit.length && <Empty title="No activity yet" sub="Actions you take will appear here." />}
      <div className="card">
        {audit.map((a) => (
          <div key={a.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
            <span className="badge badge-gold">{AUDIT_LABELS[a.kind] || a.kind}</span>
            <span style={{ flex: 1 }}>{a.message}</span>
            <span className="faint mono" style={{ fontSize: 11 }}>{new Date(a.ts).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
