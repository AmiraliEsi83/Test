import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { tradingService } from '../services/engine.js';
import { prisma } from '../db/client.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  res.json({ riskSettings: tradingService.riskManager.getSettings() });
});

router.post('/update', requireAuth, async (req, res) => {
  try {
    const {
      maxRiskPerTradePct,
      maxPositionSizeLots,
      maxDailyLossUsd,
      maxDailyLossPct,
      maxOpenPositions,
      maxExposurePerAssetLots,
      consecutiveLossThreshold,
      cooldownMinutes,
    } = req.body;

    tradingService.riskManager.updateSettings({
      maxRiskPerTradePct: Number(maxRiskPerTradePct),
      maxPositionSizeLots: Number(maxPositionSizeLots),
      maxDailyLossUsd: Number(maxDailyLossUsd),
      maxDailyLossPct: Number(maxDailyLossPct),
      maxOpenPositions: Number(maxOpenPositions),
      maxExposurePerAssetLots: Number(maxExposurePerAssetLots),
      consecutiveLossThreshold: Number(consecutiveLossThreshold),
      cooldownMinutes: Number(cooldownMinutes),
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'RISK_RULES_UPDATED',
        category: 'RISK',
        details: `Updated risk parameters: max risk ${maxRiskPerTradePct}%, max daily loss $${maxDailyLossUsd}`,
        level: 'INFO',
      },
    });

    res.json({ riskSettings: tradingService.riskManager.getSettings() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/kill-switch', requireAuth, async (req, res) => {
  const { reason = 'Emergency manual kill switch triggered by user' } = req.body;
  tradingService.riskManager.triggerKillSwitch(reason);

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'RISK_KILL_SWITCH_TRIPPED',
      category: 'RISK',
      details: reason,
      level: 'WARN',
    },
  });

  tradingService.broadcast({
    type: 'KILL_SWITCH_UPDATE',
    payload: { active: true, reason },
  });

  res.json({
    success: true,
    riskSettings: tradingService.riskManager.getSettings(),
  });
});

router.post('/reset-kill-switch', requireAuth, async (req, res) => {
  tradingService.riskManager.resetKillSwitch();

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'RISK_KILL_SWITCH_RESET',
      category: 'RISK',
      details: 'Kill switch manually reset by user',
      level: 'INFO',
    },
  });

  tradingService.broadcast({
    type: 'KILL_SWITCH_UPDATE',
    payload: { active: false },
  });

  res.json({
    success: true,
    riskSettings: tradingService.riskManager.getSettings(),
  });
});

export default router;
