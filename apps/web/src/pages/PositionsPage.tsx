import React, { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { PositionsTable } from '../components/dashboard/PositionsTable';
import { ModifyPositionModal } from '../components/modals/ModifyPositionModal';
import { PartialCloseModal } from '../components/modals/PartialCloseModal';
import { useTrading } from '../context/TradingContext';
import { Position } from '@harsi/shared';
import { Briefcase } from 'lucide-react';

export const PositionsPage: React.FC = () => {
  const { positions, modifyPosition, partialClosePosition } = useTrading();
  const [modifyingPos, setModifyingPos] = useState<Position | null>(null);
  const [partialClosingPos, setPartialClosingPos] = useState<Position | null>(null);

  const totalUnrealized = positions.reduce((s, p) => s + p.unrealizedPnl, 0);

  return (
    <div className="min-h-screen bg-[#080b10] flex flex-col">
      <TopBar />
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-400" />
              Open Positions ({positions.length})
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live mark-to-market positions ledger with single-click stop/target adjustments and partial fills.
            </p>
          </div>

          <div className="text-right font-mono">
            <div className="text-xs text-slate-400">Total Unrealized P/L</div>
            <div
              className={`text-base font-extrabold ${
                totalUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalUnrealized >= 0 ? '+' : ''}${totalUnrealized.toFixed(2)}
            </div>
          </div>
        </div>

        <PositionsTable
          onModify={(pos) => setModifyingPos(pos)}
          onPartialClose={(pos) => setPartialClosingPos(pos)}
        />
      </main>

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
