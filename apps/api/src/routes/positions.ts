import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { tradingService } from '../services/engine.js';
import { prisma } from '../db/client.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const positions = await tradingService.activeBroker.getPositions();
    res.json({ positions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/close/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await tradingService.orderManager.closePosition(id);

    tradingService.broadcast({
      type: 'POSITION_CLOSED',
      payload: { id },
    });

    res.json({ success: true, message: `Position ${id} closed.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/partial-close/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { lots } = req.body;
    if (!lots || lots <= 0) {
      return res.status(400).json({ error: 'Valid lots to close is required' });
    }

    await tradingService.orderManager.closePosition(id, Number(lots));

    tradingService.broadcast({
      type: 'POSITION_PARTIAL_CLOSED',
      payload: { id, closedLots: Number(lots) },
    });

    res.json({ success: true, message: `Closed ${lots} lots of position ${id}.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/modify/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { stopLoss, takeProfit } = req.body;

    const updated = await tradingService.orderManager.modifyPosition(
      id,
      stopLoss !== undefined ? Number(stopLoss) : undefined,
      takeProfit !== undefined ? Number(takeProfit) : undefined
    );

    tradingService.broadcast({
      type: 'POSITION_MODIFIED',
      payload: updated,
    });

    res.json({ position: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
