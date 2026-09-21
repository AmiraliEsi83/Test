"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const engine_js_1 = require("../services/engine.js");
const client_js_1 = require("../db/client.js");
const router = (0, express_1.Router)();
router.get('/', auth_js_1.requireAuth, async (req, res) => {
    try {
        const orders = await engine_js_1.tradingService.activeBroker.getOrders();
        res.json({ orders });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { symbol, side, type = 'MARKET', lots = 0.1, price, stopLoss, takeProfit } = req.body;
        if (!symbol || !side || !lots) {
            return res.status(400).json({ error: 'Symbol, side and lots are required' });
        }
        const order = await engine_js_1.tradingService.orderManager.submitOrder({
            symbol: symbol.toUpperCase(),
            side: side.toUpperCase(),
            type: type.toUpperCase(),
            lots: Number(lots),
            price: price ? Number(price) : undefined,
            stopLoss: stopLoss ? Number(stopLoss) : undefined,
            takeProfit: takeProfit ? Number(takeProfit) : undefined,
            mode: engine_js_1.tradingService.activeBroker.mode,
        });
        // Save to database
        try {
            await client_js_1.prisma.order.create({
                data: {
                    id: order.id,
                    userId: req.user.id,
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
        }
        catch (e) {
            // ignore
        }
        engine_js_1.tradingService.broadcast({
            type: 'ORDER_UPDATE',
            payload: order,
        });
        res.json({ order });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/cancel/:id', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await engine_js_1.tradingService.activeBroker.cancelOrder(id);
        res.json({ success: true, message: `Order ${id} cancelled.` });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
