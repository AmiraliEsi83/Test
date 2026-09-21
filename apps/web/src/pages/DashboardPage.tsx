import React, { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { PortfolioSummary } from '../components/dashboard/PortfolioSummary';
import { Watchlist } from '../components/dashboard/Watchlist';
import { TradingChart } from '../components/chart/TradingChart';
import { OrderTicket } from '../components/dashboard/OrderTicket';
import { PositionsTable } from '../components/dashboard/PositionsTable';
import { SignalsFeed } from '../components/dashboard/SignalsFeed';
import { SignalDetailModal } from '../components/modals/SignalDetailModal';
import { ModifyPositionModal } from '../components/modals/ModifyPositionModal';
import { PartialCloseModal } from '../components/modals/PartialCloseModal';
import { useTrading } from '../context/TradingContext';
import { Position } from '@harsi/shared';
import { Layers, ListOrdered, Radio } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    selectedSignal,
    setSelectedSignal,
    placeOrder,
    modifyPosition,
    partialClosePosition,
    orders,
  } = useTrading();

  const [activeBottomTab, setActiveBottomTab] = useState<'positions' | 'orders' | 'signals'>('positions');
  const [modifyingPos, setModifyingPos] = useState<Position | null>(null);
  const [partialClosingPos, setPartialClosingPos] = useState<Position | null>(null);

  return (
    <div className="min-h-screen bg-[#080b10] flex flex-col">
      <TopBar />
      <Navbar />

      <main className="flex-1 p-3 space-y-3 max-w-[1720px] w-full mx-auto">
        {/* Top Portfolio Overview */}
        <PortfolioSummary />

        {/* 3-Column Core Trading Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* Left Watchlist Column (2.5 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <Watchlist />
          </div>

          {/* Center Chart & Ledger Column (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <TradingChart />

            {/* Bottom Tabs: Positions, Orders, Signals Feed */}
            <div className="terminal-card overflow-hidden bg-[#0e131d]">
              <div className="px-3 border-b border-[#1e2638] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveBottomTab('positions')}
                    className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
                      activeBottomTab === 'positions'
                        ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Open Positions
                  </button>

                  <button
                    onClick={() => setActiveBottomTab('orders')}
                    className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
                      activeBottomTab === 'orders'
                        ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    Orders ({orders.length})
                  </button>

                  <button
                    onClick={() => setActiveBottomTab('signals')}
                    className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
                      activeBottomTab === 'signals'
                        ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    Live Signals
                  </button>
                </div>

                <div className="text-[11px] font-mono text-slate-500">
                  Execution: Instant Fill · Paper Desk
                </div>
              </div>

              <div className="p-2">
                {activeBottomTab === 'positions' && (
                  <PositionsTable
                    onModify={(pos) => setModifyingPos(pos)}
                    onPartialClose={(pos) => setPartialClosingPos(pos)}
                  />
                )}

                {activeBottomTab === 'orders' && (
                  <div className="overflow-x-auto">
                    <table className="terminal-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Time</th>
                          <th>Asset</th>
                          <th>Side</th>
                          <th>Type</th>
                          <th>Lots</th>
                          <th>Price</th>
                          <th>Status</th>
                          <th>Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => (
                          <tr key={o.id} className="font-mono text-xs">
                            <td className="text-slate-400">{o.id.slice(-8)}</td>
                            <td className="text-slate-400">
                              {new Date(o.createdAt).toLocaleTimeString()}
                            </td>
                            <td className="font-bold text-white">{o.symbol}</td>
                            <td className={o.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                              {o.side}
                            </td>
                            <td>{o.type}</td>
                            <td>{o.lots}</td>
                            <td className="text-slate-200">{o.filledPrice || o.price}</td>
                            <td>
                              <span className="badge-buy text-[10px]">{o.status}</span>
                            </td>
                            <td>
                              <span className="badge-paper text-[10px]">{o.mode}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeBottomTab === 'signals' && <SignalsFeed />}
              </div>
            </div>
          </div>

          {/* Right Order Ticket & Quick Radar Column (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <OrderTicket />
            <SignalsFeed />
          </div>
        </div>
      </main>

      {/* Modals */}
      <SignalDetailModal
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
        onExecute={(sig) => {
          placeOrder({
            symbol: sig.symbol,
            side: sig.side,
            lots: 0.5,
            price: sig.price,
            stopLoss: sig.stopLoss,
            takeProfit: sig.takeProfit,
            strategyId: sig.strategyId,
          });
        }}
      />

      <ModifyPositionModal
        position={modifyingPos}
        onClose={() => setModifyingPos(null)}
        onSave={async (id, sl, tp) => {
          await modifyPosition(id, sl, tp);
        }}
      />

      <PartialCloseModal
        position={partialClosingPos}
        onClose={() => setPartialClosingPos(null)}
        onConfirm={async (id, lots) => {
          await partialClosePosition(id, lots);
        }}
      />
    </div>
  );
};
