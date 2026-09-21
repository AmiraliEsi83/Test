"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const engine_js_1 = require("../services/engine.js");
const router = (0, express_1.Router)();
router.get('/', auth_js_1.requireAuth, async (req, res) => {
    try {
        const positions = await engine_js_1.tradingService.activeBroker.getPositions();
        res.json({ positions });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/close/:id', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await engine_js_1.tradingService.orderManager.closePosition(id);
        engine_js_1.tradingService.broadcast({
            type: 'POSITION_CLOSED',
            payload: { id },
        });
        res.json({ success: true, message: `Position ${id} closed.` });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/partial-close/:id', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { lots } = req.body;
        if (!lots || lots <= 0) {
            return res.status(400).json({ error: 'Valid lots to close is required' });
        }
        await engine_js_1.tradingService.orderManager.closePosition(id, Number(lots));
        engine_js_1.tradingService.broadcast({
            type: 'POSITION_PARTIAL_CLOSED',
            payload: { id, closedLots: Number(lots) },
        });
        res.json({ success: true, message: `Closed ${lots} lots of position ${id}.` });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/modify/:id', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { stopLoss, takeProfit } = req.body;
        const updated = await engine_js_1.tradingService.orderManager.modifyPosition(id, stopLoss !== undefined ? Number(stopLoss) : undefined, takeProfit !== undefined ? Number(takeProfit) : undefined);
        engine_js_1.tradingService.broadcast({
            type: 'POSITION_MODIFIED',
            payload: updated,
        });
        res.json({ position: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
