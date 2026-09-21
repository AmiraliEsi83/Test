"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_js_1 = require("../db/client.js");
const engine_js_1 = require("../services/engine.js");
const router = (0, express_1.Router)();
router.get('/active', (req, res) => {
    const active = engine_js_1.tradingService.getActiveSignals();
    res.json({ signals: active });
});
router.get('/history', async (req, res) => {
    try {
        const { strategy, symbol, side, limit = '50' } = req.query;
        const where = {};
        if (strategy)
            where.strategyId = String(strategy);
        if (symbol)
            where.symbol = String(symbol).toUpperCase();
        if (side)
            where.side = String(side).toUpperCase();
        const dbSignals = await client_js_1.prisma.signal.findMany({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const signal = await client_js_1.prisma.signal.findUnique({
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
