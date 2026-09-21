"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const engine_js_1 = require("../services/engine.js");
const client_js_1 = require("../db/client.js");
const router = (0, express_1.Router)();
router.get('/', auth_js_1.requireAuth, (req, res) => {
    res.json({ riskSettings: engine_js_1.tradingService.riskManager.getSettings() });
});
router.post('/update', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { maxRiskPerTradePct, maxPositionSizeLots, maxDailyLossUsd, maxDailyLossPct, maxOpenPositions, maxExposurePerAssetLots, consecutiveLossThreshold, cooldownMinutes, } = req.body;
        engine_js_1.tradingService.riskManager.updateSettings({
            maxRiskPerTradePct: Number(maxRiskPerTradePct),
            maxPositionSizeLots: Number(maxPositionSizeLots),
            maxDailyLossUsd: Number(maxDailyLossUsd),
            maxDailyLossPct: Number(maxDailyLossPct),
            maxOpenPositions: Number(maxOpenPositions),
            maxExposurePerAssetLots: Number(maxExposurePerAssetLots),
            consecutiveLossThreshold: Number(consecutiveLossThreshold),
            cooldownMinutes: Number(cooldownMinutes),
        });
        await client_js_1.prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'RISK_RULES_UPDATED',
                category: 'RISK',
                details: `Updated risk parameters: max risk ${maxRiskPerTradePct}%, max daily loss $${maxDailyLossUsd}`,
                level: 'INFO',
            },
        });
        res.json({ riskSettings: engine_js_1.tradingService.riskManager.getSettings() });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/kill-switch', auth_js_1.requireAuth, async (req, res) => {
    const { reason = 'Emergency manual kill switch triggered by user' } = req.body;
    engine_js_1.tradingService.riskManager.triggerKillSwitch(reason);
    await client_js_1.prisma.auditLog.create({
        data: {
            userId: req.user.id,
            action: 'RISK_KILL_SWITCH_TRIPPED',
            category: 'RISK',
            details: reason,
            level: 'WARN',
        },
    });
    engine_js_1.tradingService.broadcast({
        type: 'KILL_SWITCH_UPDATE',
        payload: { active: true, reason },
    });
    res.json({
        success: true,
        riskSettings: engine_js_1.tradingService.riskManager.getSettings(),
    });
});
router.post('/reset-kill-switch', auth_js_1.requireAuth, async (req, res) => {
    engine_js_1.tradingService.riskManager.resetKillSwitch();
    await client_js_1.prisma.auditLog.create({
        data: {
            userId: req.user.id,
            action: 'RISK_KILL_SWITCH_RESET',
            category: 'RISK',
            details: 'Kill switch manually reset by user',
            level: 'INFO',
        },
    });
    engine_js_1.tradingService.broadcast({
        type: 'KILL_SWITCH_UPDATE',
        payload: { active: false },
    });
    res.json({
        success: true,
        riskSettings: engine_js_1.tradingService.riskManager.getSettings(),
    });
});
exports.default = router;
