import { Router } from 'express';
import { prisma } from '../db/client.js';
import { tradingService } from '../services/engine.js';

const router = Router();

router.get('/active', (req, res) => {
  const active = tradingService.getActiveSignals();
  res.json({ signals: active });
});

router.get('/history', async (req, res) => {
  try {
    const { strategy, symbol, side, limit = '50' } = req.query;
    const where: any = {};
    if (strategy) where.strategyId = String(strategy);
    if (symbol) where.symbol = String(symbol).toUpperCase();
    if (side) where.side = String(side).toUpperCase();

    const dbSignals = await prisma.signal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit), 100),
    });

    const parsed = dbSignals.map((s) => ({
      ...s,
      timestamp: Number(s.timestamp),
      conditions: JSON.parse(s.conditions || '[]'),
      metadata: s.metadata ? JSON.parse(s.metadata) : null,
    }));

    res.json({ signals: parsed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const signal = await prisma.signal.findUnique({
      where: { id },
    });
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    res.json({
      signal: {
        ...signal,
        timestamp: Number(signal.timestamp),
        conditions: JSON.parse(signal.conditions || '[]'),
        metadata: signal.metadata ? JSON.parse(signal.metadata) : null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
