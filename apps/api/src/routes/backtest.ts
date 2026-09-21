import { Router } from 'express';
import { defaultStrategyRegistry } from '@harsi/strategies';
import { requireAuth, requireSubscription } from '../middleware/auth.js';
import { tradingService } from '../services/engine.js';
import { prisma } from '../db/client.js';

const router = Router();

router.post('/run', requireAuth, requireSubscription('TRADER'), async (req, res) => {
  try {
    const {
      strategyId = 'london-harsi',
      symbol = 'EURUSD',
      timeframe = '15m',
      startingBalance = 100000,
      riskPct = 1.0,
      params = {},
    } = req.body;

    const strategy = defaultStrategyRegistry.get(strategyId);
    if (!strategy) {
      return res.status(404).json({ error: `Strategy ${strategyId} not found` });
    }

    // Generate or fetch 250 historical candles for backtesting
    const candles = tradingService.feed.generateHistory(symbol.toUpperCase(), 250);

    const result = tradingService.backtester.run(strategy, candles, {
      strategyId,
      symbol: symbol.toUpperCase(),
      timeframe,
      startDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      startingBalance: Number(startingBalance),
      riskPct: Number(riskPct),
      params,
    });

    // Save run to database
    try {
      await prisma.backtestRun.create({
        data: {
          id: result.id,
          userId: req.user!.id,
          strategyId: result.strategyId,
          strategyName: result.strategyName,
          symbol: result.symbol,
          timeframe: result.timeframe,
          startDate: result.startDate,
          endDate: result.endDate,
          startingBalance: result.startingBalance,
          finalBalance: result.finalBalance,
          netProfit: result.netProfit,
          returnPct: result.returnPct,
          totalTrades: result.totalTrades,
          winningTrades: result.winningTrades,
          losingTrades: result.losingTrades,
          winRate: result.winRate,
          profitFactor: result.profitFactor,
          maxDrawdownPct: result.maxDrawdownPct,
          averageTrade: result.averageTrade,
          parameters: JSON.stringify(result.parameters),
          resultJson: JSON.stringify(result),
        },
      });
    } catch (e) {
      // ignore
    }

    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', requireAuth, async (req, res) => {
  try {
    const runs = await prisma.backtestRun.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ runs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const run = await prisma.backtestRun.findUnique({
      where: { id: req.params.id },
    });
    if (!run) return res.status(404).json({ error: 'Backtest run not found' });
    res.json({ result: JSON.parse(run.resultJson) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
