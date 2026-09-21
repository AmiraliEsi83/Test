import { Router } from 'express';
import { requireAuth, requireSubscription } from '../middleware/auth.js';
import { tradingService } from '../services/engine.js';
import { prisma } from '../db/client.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const brokers = [
    tradingService.paperBroker.getInfo(),
    tradingService.alpacaBroker.getInfo(),
    tradingService.oandaBroker.getInfo(),
    tradingService.ibkrBroker.getInfo(),
  ];

  const activeAccount = await tradingService.activeBroker.getAccount();

  res.json({
    brokers,
    activeBrokerId: tradingService.activeBroker.id,
    activeAccount,
  });
});

router.post('/select', requireAuth, (req, res) => {
  const { brokerId } = req.body;
  if (!['paper', 'alpaca', 'oanda', 'ibkr'].includes(brokerId)) {
    return res.status(400).json({ error: 'Unknown broker ID' });
  }

  // Live brokers require Pro plan
  if (brokerId !== 'paper' && req.user!.subscriptionTier !== 'PRO') {
    return res.status(403).json({
      error: 'Connecting live broker adapters requires an Institutional Pro plan.',
      requiredTier: 'PRO',
      currentTier: req.user!.subscriptionTier,
    });
  }

  tradingService.setActiveBroker(brokerId);
  res.json({
    success: true,
    activeBroker: tradingService.activeBroker.getInfo(),
  });
});

router.post('/connect', requireAuth, requireSubscription('PRO'), async (req, res) => {
  const { brokerType, credentials } = req.body;

  try {
    let adapter;
    if (brokerType === 'alpaca') adapter = tradingService.alpacaBroker;
    else if (brokerType === 'oanda') adapter = tradingService.oandaBroker;
    else if (brokerType === 'ibkr') adapter = tradingService.ibkrBroker;
    else return res.status(400).json({ error: 'Invalid broker type' });

    await adapter.connect(credentials);

    // Record connection status in database (without plain text secrets)
    await prisma.brokerConnection.upsert({
      where: {
        userId_brokerType: {
          userId: req.user!.id,
          brokerType,
        },
      },
      update: {
        status: adapter.isConnected() ? 'CONNECTED' : 'NOT_CONFIGURED',
        lastSync: new Date(),
        environment: credentials.env || 'sandbox',
        accountId: credentials.accountId || credentials.keyId || 'CONNECTED-ACC',
      },
      create: {
        userId: req.user!.id,
        brokerType,
        status: adapter.isConnected() ? 'CONNECTED' : 'NOT_CONFIGURED',
        lastSync: new Date(),
        environment: credentials.env || 'sandbox',
        accountId: credentials.accountId || credentials.keyId || 'CONNECTED-ACC',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'BROKER_CONNECTED',
        category: 'BROKER',
        details: `Connected to ${brokerType} in ${credentials.env || 'sandbox'} environment`,
        level: 'INFO',
      },
    });

    res.json({ success: true, info: adapter.getInfo() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/disconnect', requireAuth, async (req, res) => {
  const { brokerType } = req.body;
  if (brokerType === 'alpaca') await tradingService.alpacaBroker.disconnect();
  else if (brokerType === 'oanda') await tradingService.oandaBroker.disconnect();
  else if (brokerType === 'ibkr') await tradingService.ibkrBroker.disconnect();

  if (tradingService.activeBroker.id === brokerType) {
    tradingService.setActiveBroker('paper');
  }

  res.json({ success: true, message: `${brokerType} disconnected.` });
});

export default router;
