"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const engine_js_1 = require("../services/engine.js");
const client_js_1 = require("../db/client.js");
const router = (0, express_1.Router)();
router.get('/', auth_js_1.requireAuth, (req, res) => {
    res.json({ automation: engine_js_1.tradingService.automationSettings });
});
router.post('/update', auth_js_1.requireAuth, async (req, res) => {
    const { strategies, masterEmergencyStop } = req.body;
    if (strategies) {
        // If enabling live auto-execute, check if subscription is PRO and risk is confirmed
        for (const [stratId, rule] of Object.entries(strategies)) {
            if (rule.liveAutoExecute) {
                if (req.user.subscriptionTier !== 'PRO') {
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
        engine_js_1.tradingService.automationSettings.strategies = {
            ...engine_js_1.tradingService.automationSettings.strategies,
            ...strategies,
        };
    }
    if (masterEmergencyStop !== undefined) {
        engine_js_1.tradingService.automationSettings.masterEmergencyStop = Boolean(masterEmergencyStop);
    }
    engine_js_1.tradingService.executionPipeline.updateAutomation(engine_js_1.tradingService.automationSettings);
    await client_js_1.prisma.auditLog.create({
        data: {
            userId: req.user.id,
            action: 'AUTOMATION_SETTINGS_UPDATED',
            category: 'AUTOMATION',
            details: `Automation updated: Master stop is ${engine_js_1.tradingService.automationSettings.masterEmergencyStop ? 'ACTIVE' : 'OFF'}`,
            level: 'INFO',
        },
    });
    res.json({ automation: engine_js_1.tradingService.automationSettings });
});
router.post('/emergency-stop', auth_js_1.requireAuth, async (req, res) => {
    engine_js_1.tradingService.automationSettings.masterEmergencyStop = true;
    engine_js_1.tradingService.riskManager.triggerKillSwitch('EMERGENCY STOP ALL AUTOMATION ACTIVATED BY USER');
    await client_js_1.prisma.auditLog.create({
        data: {
            userId: req.user.id,
            action: 'EMERGENCY_STOP_TRIGGERED',
            category: 'AUTOMATION',
            details: 'User engaged STOP ALL AUTOMATION emergency circuit breaker.',
            level: 'WARN',
        },
    });
    engine_js_1.tradingService.broadcast({
        type: 'EMERGENCY_STOP',
        payload: { active: true },
    });
    res.json({
        success: true,
        message: 'EMERGENCY STOP ENGAGED: All automated execution and strategy triggers halted immediately.',
        automation: engine_js_1.tradingService.automationSettings,
    });
});
exports.default = router;
