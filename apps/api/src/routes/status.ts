import { Router } from 'express';
import { SystemStatus } from '@harsi/shared';
import { tradingService } from '../services/engine.js';
import { prisma } from '../db/client.js';

const router = Router();
const startTime = Date.now();

router.get('/health', async (req, res) => {
  const startPing = Date.now();
  let dbStatus = 'ONLINE';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'DEGRADED';
  }
  const latencyMs = Date.now() - startPing;

  const status: SystemStatus = {
    api: dbStatus === 'ONLINE' ? 'ONLINE' : 'DEGRADED',
    marketData: 'CONNECTED',
    websocket: 'ACTIVE',
    strategyEngine: tradingService.automationSettings.masterEmergencyStop ? 'PAUSED' : 'RUNNING',
    brokerPaper: tradingService.paperBroker.isConnected() ? 'ACTIVE' : 'ERROR',
    brokerLive:
      tradingService.alpacaBroker.isConnected() || tradingService.oandaBroker.isConnected()
        ? 'CONNECTED'
        : 'NOT_CONFIGURED',
    latencyMs,
    activeSockets: (tradingService as any).wsClients?.size || 0,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  };

  res.json({
    status,
    timestamp: new Date().toISOString(),
    version: '1.0.0-institutional',
  });
});

export default router;
