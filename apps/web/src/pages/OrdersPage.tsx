import React, { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { useTrading } from '../context/TradingContext';
import { OrderStatus, formatPrice } from '@harsi/shared';
import { ListOrdered } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const { orders } = useTrading();
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'FILLED' | 'CANCELLED'>('ALL');

  const filtered = orders.filter((o) => {
    if (activeTab === 'ALL') return true;
    return o.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-[#080b10] flex flex-col">
      <TopBar />
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-emerald-400" />
              Orders Ledger
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Complete order audit records across Market, Limit, and Strategy automated routing.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#121622] p-1 rounded-md border border-[#1e2638]">
            {(['ALL', 'FILLED', 'PENDING', 'CANCELLED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs font-semibold rounded transition ${
                  activeTab === tab
                    ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="terminal-card overflow-x-auto bg-[#0e131d]">
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Time (UTC)</th>
                <th>Asset</th>
                <th>Direction</th>
                <th>Type</th>
                <th>Size (Lots)</th>
                <th>Req. Price</th>
                <th>Filled Price</th>
                <th>Commission</th>
                <th>Slippage</th>
                <th>Status</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-slate-500">
                    No orders found for selected tab.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="font-mono text-xs">
                    <td className="text-slate-400">{o.id}</td>
                    <td className="text-slate-400">{new Date(o.createdAt).toLocaleString()}</td>
                    <td className="font-bold text-white">{o.symbol}</td>
                    <td className={o.side === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {o.side}
                    </td>
                    <td>{o.type}</td>
                    <td>{o.lots} lots</td>
                    <td className="text-slate-300">{formatPrice(o.symbol, o.price)}</td>
                    <td className="text-white font-bold">{formatPrice(o.symbol, o.filledPrice || o.price)}</td>
                    <td className="text-slate-400">${o.commission.toFixed(2)}</td>
                    <td className="text-slate-400">{o.slippage.toFixed(1)}p</td>
                    <td>
                      <span className="badge-buy text-[10px]">{o.status}</span>
                    </td>
                    <td>
                      <span className="badge-paper text-[10px]">{o.mode}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
