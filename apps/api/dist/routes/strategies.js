"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const strategies_1 = require("@harsi/strategies");
const client_js_1 = require("../db/client.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.get('/list', (req, res) => {
    const strategies = strategies_1.defaultStrategyRegistry.getAll().map((s) => ({
        id: s.id,
        name: s.name,
        badge: s.badge,
        summary: s.summary,
        rules: s.rules,
        defaultConfig: s.defaultConfig,
    }));
    res.json({ strategies });
});
router.get('/configs', auth_js_1.requireAuth, async (req, res) => {
    try {
        const configs = await client_js_1.prisma.strategyConfig.findMany({
            where: { userId: req.user.id },
        });
        res.json({ configs });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/config', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { strategyId, enabled, symbols, timeframe, parameters, maxSignalsPerDay, cooldownMinutes } = req.body;
        const updated = await client_js_1.prisma.strategyConfig.upsert({
            where: {
                userId_strategyId: {
                    userId: req.user.id,
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
                userId: req.user.id,
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
