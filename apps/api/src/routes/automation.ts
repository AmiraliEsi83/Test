import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { tradingService } from '../services/engine.js';
import { prisma } from '../db/client.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  res.json({ automation: tradingService.automationSettings });
});

router.post('/update', requireAuth, async (req, res) => {
  const { strategies, masterEmergencyStop } = req.body;

  if (strategies) {
    // If enabling live auto-execute, check if subscription is PRO and risk is confirmed
    for (const [stratId, rule] of Object.entries(strategies as Record<string, any>)) {
      if (rule.liveAutoExecute) {
        if (req.user!.subscriptionTier !== 'PRO') {
          return res.status(403).json({
            error: 'Live automated broker execution requires an Institutional Pro subscription.',
          });
        }
        if (!rule.confirmedLiveRisk) {
          return res.status(400).json({
            error: `Explicit live execution risk confirmation required for ${stratId}.`,
          });
        }
      }
    }
    tradingService.automationSettings.strategies = {
      ...tradingService.automationSettings.strategies,
      ...strategies,
    };
  }

  if (masterEmergencyStop !== undefined) {
    tradingService.automationSettings.masterEmergencyStop = Boolean(masterEmergencyStop);
  }

  tradingService.executionPipeline.updateAutomation(tradingService.automationSettings);

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'AUTOMATION_SETTINGS_UPDATED',
      category: 'AUTOMATION',
      details: `Automation updated: Master stop is ${tradingService.automationSettings.masterEmergencyStop ? 'ACTIVE' : 'OFF'}`,
      level: 'INFO',
    },
  });

  res.json({ automation: tradingService.automationSettings });
});

router.post('/emergency-stop', requireAuth, async (req, res) => {
  tradingService.automationSettings.masterEmergencyStop = true;
  tradingService.riskManager.triggerKillSwitch('EMERGENCY STOP ALL AUTOMATION ACTIVATED BY USER');

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'EMERGENCY_STOP_TRIGGERED',
      category: 'AUTOMATION',
      details: 'User engaged STOP ALL AUTOMATION emergency circuit breaker.',
      level: 'WARN',
    },
  });

  tradingService.broadcast({
    type: 'EMERGENCY_STOP',
    payload: { active: true },
  });

  res.json({
    success: true,
    message: 'EMERGENCY STOP ENGAGED: All automated execution and strategy triggers halted immediately.',
    automation: tradingService.automationSettings,
  });
});

export default router;
