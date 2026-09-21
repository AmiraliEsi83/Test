import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { tradingService } from '../services/engine.js';
import { prisma } from '../db/client.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const orders = await tradingService.activeBroker.getOrders();
    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { symbol, side, type = 'MARKET', lots = 0.1, price, stopLoss, takeProfit } = req.body;
    if (!symbol || !side || !lots) {
      return res.status(400).json({ error: 'Symbol, side and lots are required' });
    }

    const order = await tradingService.orderManager.submitOrder({
      symbol: symbol.toUpperCase(),
      side: side.toUpperCase(),
      type: type.toUpperCase(),
      lots: Number(lots),
      price: price ? Number(price) : undefined,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      mode: tradingService.activeBroker.mode,
    });

    // Save to database
    try {
      await prisma.order.create({
        data: {
          id: order.id,
          userId: req.user!.id,
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          lots: order.lots,
          price: order.price,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit,
          status: order.status,
          filledPrice: order.filledPrice,
          filledAt: order.filledAt ? new Date(order.filledAt) : null,
          commission: order.commission,
          slippage: order.slippage,
          brokerType: order.brokerType,
          mode: order.mode,
        },
      });
    } catch (e) {
      // ignore
    }

    tradingService.broadcast({
      type: 'ORDER_UPDATE',
      payload: order,
    });

    res.json({ order });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/cancel/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await tradingService.activeBroker.cancelOrder(id);
    res.json({ success: true, message: `Order ${id} cancelled.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
