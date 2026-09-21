import React, { useState } from "react";
import { useTrading } from "../context/TradingContext";
import { formatPrice } from "../lib/instruments";
import { PageHeader, Empty } from "../components/ui";

export default function Orders() {
  const { orders, cancelOrder } = useTrading();
  const [tab, setTab] = useState("all");
  const list = orders.filter((o) => tab === "all" || o.status === tab || (tab === "open" && (o.status === "pending" || o.status === "open")));
  const counts = {
    pending: orders.filter((o) => o.status === "pending").length,
    filled: orders.filter((o) => o.status === "filled").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };
  return (
    <div className="page dash">
      <PageHeader kicker="Orders" title="Orders" sub={`${counts.pending} pending · ${counts.filled} filled · ${counts.cancelled} cancelled`} right={<div className="tabs">{["all", "pending", "filled", "cancelled", "rejected"].map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}</div>} />
      {!list.length && <Empty title="No orders here" sub="Place market, limit or stop orders from the terminal ticket." />}
      {!!list.length && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="pos-table">
            <thead><tr><th>ID</th><th>Symbol</th><th>Side</th><th>Type</th><th>Lots</th><th>Price</th><th>Status</th><th>Strategy</th><th>Created</th><th>Action</th></tr></thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td>{o.id.slice(-6)}</td>
                  <td>{o.symbol}</td>
                  <td className={o.side === "buy" ? "up" : "down"}>{o.side.toUpperCase()}</td>
                  <td>{o.type}</td>
                  <td>{o.lots}</td>
                  <td>{formatPrice(o.symbol, o.fillPrice ?? o.price)}</td>
                  <td><span className={`badge ${o.status === "filled" ? "badge-buy" : o.status === "pending" ? "badge-gold" : "badge-sell"}`}>{o.status.toUpperCase()}</span></td>
                  <td>{o.algorithm}</td>
                  <td>{new Date(o.createdAt).toLocaleString()}</td>
                  <td>{o.status === "pending" && <button className="btn btn-ghost btn-sm" onClick={() => cancelOrder(o.id)}>Cancel</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
