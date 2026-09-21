import {
  Candle,
  BacktestRequest,
  BacktestResult,
  BacktestTrade,
  calcPnl,
  getInstrument,
} from '@harsi/shared';
import { StrategyPlugin } from '@harsi/strategies';
import { getSessionState, extractAsianRange } from '@harsi/market-data';

export class BacktestingEngine {
  public run(
    strategy: StrategyPlugin,
    candles: Candle[],
    request: BacktestRequest
  ): BacktestResult {
    const inst = getInstrument(request.symbol);
    let balance = request.startingBalance;
    let peakEquity = balance;
    let maxDrawdownPct = 0;

    const equityCurve: Array<{ time: number; equity: number }> = [
      { time: candles[0]?.time || Math.floor(Date.now() / 1000), equity: balance },
    ];
    const trades: BacktestTrade[] = [];

    let activeTrade: {
      side: 'BUY' | 'SELL';
      lots: number;
      entryPrice: number;
      entryTime: number;
      stopLoss: number;
      takeProfit: number;
      reason: string;
    } | null = null;

    const lookbackMin = 40;

    for (let i = lookbackMin; i < candles.length; i++) {
      const currentCandle = candles[i];
      const historySlice = candles.slice(0, i + 1); // Strictly past + current candle (NO future bars)

      // 1. If an active position exists, check if this candle hit SL or TP
      if (activeTrade) {
        let isClosed = false;
        let exitPrice = currentCandle.close;
        let exitReason = 'END_OF_DATA';

        if (activeTrade.side === 'BUY') {
          if (currentCandle.low <= activeTrade.stopLoss) {
            exitPrice = activeTrade.stopLoss;
            exitReason = 'STOP_LOSS_HIT';
            isClosed = true;
          } else if (currentCandle.high >= activeTrade.takeProfit) {
            exitPrice = activeTrade.takeProfit;
            exitReason = 'TAKE_PROFIT_HIT';
            isClosed = true;
          }
        } else {
          if (currentCandle.high >= activeTrade.stopLoss) {
            exitPrice = activeTrade.stopLoss;
            exitReason = 'STOP_LOSS_HIT';
            isClosed = true;
          } else if (currentCandle.low <= activeTrade.takeProfit) {
            exitPrice = activeTrade.takeProfit;
            exitReason = 'TAKE_PROFIT_HIT';
            isClosed = true;
          }
        }

        if (isClosed) {
          const { pnlUsd, pnlPips } = calcPnl(
            request.symbol,
            activeTrade.side,
            activeTrade.entryPrice,
            exitPrice,
            activeTrade.lots
          );

          balance += pnlUsd;
          if (balance > peakEquity) peakEquity = balance;
          const currentDd = ((peakEquity - balance) / peakEquity) * 100;
          if (currentDd > maxDrawdownPct) maxDrawdownPct = currentDd;

          trades.push({
            id: `bt_${trades.length + 1}`,
            entryTime: activeTrade.entryTime,
            exitTime: currentCandle.time,
            symbol: request.symbol,
            side: activeTrade.side,
            lots: activeTrade.lots,
            entryPrice: activeTrade.entryPrice,
            exitPrice,
            pnlUsd,
            pnlPips,
            returnPct: Number(((pnlUsd / balance) * 100).toFixed(2)),
            reason: exitReason,
          });

          equityCurve.push({
            time: currentCandle.time,
            equity: Number(balance.toFixed(2)),
          });

          activeTrade = null;
        }
      }

      // 2. If no position is open, evaluate strategy for a new signal
      if (!activeTrade) {
        const candleDate = new Date(currentCandle.time * 1000);
        const session = getSessionState(candleDate, true); // In backtest mode, session is evaluated
        const asianRange = extractAsianRange(historySlice);

        const evalResult = strategy.evaluate(
          {
            symbol: request.symbol,
            timeframe: request.timeframe,
            candles: historySlice,
            currentPrice: currentCandle.close,
            session,
            asianRange,
          },
          {
            id: strategy.id,
            enabled: true,
            symbols: [request.symbol],
            timeframe: request.timeframe,
            parameters: request.params || strategy.defaultConfig.parameters,
            maxSignalsPerDay: 5,
            cooldownMinutes: 15,
            allowedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          }
        );

        if (evalResult.signal) {
          // Open trade at current close
          const sig = evalResult.signal;
          const lots = 0.5; // standard backtest lot
          activeTrade = {
            side: sig.side,
            lots,
            entryPrice: sig.entry,
            entryTime: currentCandle.time,
            stopLoss: sig.stopLoss,
            takeProfit: sig.takeProfit,
            reason: sig.reason,
          };
        }
      }
    }

    // Performance statistics
    const winningTrades = trades.filter((t) => t.pnlUsd > 0);
    const losingTrades = trades.filter((t) => t.pnlUsd < 0);
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnlUsd, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlUsd, 0));
    const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 1.0;
    const winRate = trades.length > 0 ? Number(((winningTrades.length / trades.length) * 100).toFixed(1)) : 0;
    const netProfit = Number((balance - request.startingBalance).toFixed(2));
    const returnPct = Number(((netProfit / request.startingBalance) * 100).toFixed(2));
    const averageTrade = trades.length > 0 ? Number((netProfit / trades.length).toFixed(2)) : 0;

    return {
      id: `bt_${Date.now()}`,
      strategyId: strategy.id,
      strategyName: strategy.name,
      symbol: request.symbol,
      timeframe: request.timeframe,
      startDate: request.startDate,
      endDate: request.endDate,
      startingBalance: request.startingBalance,
      finalBalance: Number(balance.toFixed(2)),
      netProfit,
      returnPct,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      profitFactor,
      maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
      averageTrade,
      avgRiskReward: 1.5,
      equityCurve,
      trades,
      parameters: request.params || {},
      createdAt: new Date().toISOString(),
    };
  }
}
