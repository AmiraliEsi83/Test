import { Router } from 'express';
import { defaultStrategyRegistry } from '@harsi/strategies';
import { prisma } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/list', (req, res) => {
  const strategies = defaultStrategyRegistry.getAll().map((s) => ({
    id: s.id,
    name: s.name,
    badge: s.badge,
    summary: s.summary,
    rules: s.rules,
    defaultConfig: s.defaultConfig,
  }));
  res.json({ strategies });
});

router.get('/configs', requireAuth, async (req, res) => {
  try {
    const configs = await prisma.strategyConfig.findMany({
      where: { userId: req.user!.id },
    });
    res.json({ configs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/config', requireAuth, async (req, res) => {
  try {
    const { strategyId, enabled, symbols, timeframe, parameters, maxSignalsPerDay, cooldownMinutes } =
      req.body;

    const updated = await prisma.strategyConfig.upsert({
      where: {
        userId_strategyId: {
          userId: req.user!.id,
          strategyId,
        },
      },
      update: {
        enabled,
        symbols: typeof symbols === 'string' ? symbols : (symbols || []).join(','),
        timeframe,
        parameters: JSON.stringify(parameters || {}),
        maxSignalsPerDay: Number(maxSignalsPerDay || 3),
        cooldownMinutes: Number(cooldownMinutes || 30),
      },
      create: {
        userId: req.user!.id,
        strategyId,
        enabled,
        symbols: typeof symbols === 'string' ? symbols : (symbols || []).join(','),
        timeframe: timeframe || '15m',
        parameters: JSON.stringify(parameters || {}),
        maxSignalsPerDay: Number(maxSignalsPerDay || 3),
        cooldownMinutes: Number(cooldownMinutes || 30),
      },
    });

    res.json({ config: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
