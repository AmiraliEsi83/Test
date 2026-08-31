import React from "react";
import { useTrading } from "../../context/TradingContext";
import { formatPrice } from "../../lib/instruments";

export default function PositionsTable() {
  const { positions, closed, closePosition } = useTrading();

  return (
    <div className="bottom-strip">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>Positions</strong>
        <span className="faint">{positions.length} open · {closed.length} closed</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="pos-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Side</th>
              <th>Lots</th>
              <th>Entry</th>
              <th>Mark</th>
              <th>P&L</th>
              <th>Broker</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 && (
              <tr>
                <td colSpan="8" className="faint">
                  No open risk. Harsi and Pulse alerts can open from the ticket.
                </td>
              </tr>
            )}
            {positions.map((p) => (
              <tr key={p.id}>
                <td>{p.symbol}</td>
                <td className={p.side === "buy" ? "up" : "down"}>{p.side.toUpperCase()}</td>
                <td>{p.lots}</td>
                <td>{formatPrice(p.symbol, p.entry)}</td>
                <td>{formatPrice(p.symbol, p.mark)}</td>
                <td className={p.pnl >= 0 ? "up" : "down"}>
                  {p.pnl >= 0 ? "+" : ""}
                  {p.pnl.toFixed(2)}
                </td>
                <td>{p.brokerName}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => closePosition(p.id)}>
                    Close
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
