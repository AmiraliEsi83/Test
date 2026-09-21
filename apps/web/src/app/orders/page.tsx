"use client";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

const TABS = ["open", "pending", "filled", "cancelled", "rejected"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState("filled");
  const load = () => api<any>("/api/orders").then((d) => setOrders(d.orders));
  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);
  const rows = orders.filter((o) => o.status === tab);
  return (
    <Shell>
      <h2>Orders</h2>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <table>
        <thead>
          <tr>
            <th>Time</th><th>Asset</th><th>Side</th><th>Type</th><th>Lots</th><th>Price</th><th>Status</th><th>Mode</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id}>
              <td>{new Date(o.createdAt).toLocaleString()}</td>
              <td>{o.symbol}</td>
              <td className={o.side === "buy" ? "up" : "down"}>{o.side}</td>
              <td>{o.type}</td>
              <td>{o.lots}</td>
              <td>{o.averagePrice || o.price || "—"}</td>
              <td>{o.status}</td>
              <td><span className="badge badge-gold">{o.mode.toUpperCase()}</span></td>
              <td>
                {o.status === "pending" && (
                  <button className="btn btn-sm" onClick={async () => { await api(`/api/orders/${o.id}/cancel`, { method: "POST" }); load(); }}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={9} className="empty">No {tab} orders</td></tr>}
        </tbody>
      </table>
    </Shell>
  );
}
