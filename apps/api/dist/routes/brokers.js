"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const engine_js_1 = require("../services/engine.js");
const client_js_1 = require("../db/client.js");
const router = (0, express_1.Router)();
router.get('/', auth_js_1.requireAuth, async (req, res) => {
    const brokers = [
        engine_js_1.tradingService.paperBroker.getInfo(),
        engine_js_1.tradingService.alpacaBroker.getInfo(),
        engine_js_1.tradingService.oandaBroker.getInfo(),
        engine_js_1.tradingService.ibkrBroker.getInfo(),
    ];
    const activeAccount = await engine_js_1.tradingService.activeBroker.getAccount();
    res.json({
        brokers,
        activeBrokerId: engine_js_1.tradingService.activeBroker.id,
        activeAccount,
    });
});
router.post('/select', auth_js_1.requireAuth, (req, res) => {
    const { brokerId } = req.body;
    if (!['paper', 'alpaca', 'oanda', 'ibkr'].includes(brokerId)) {
        return res.status(400).json({ error: 'Unknown broker ID' });
    }
    // Live brokers require Pro plan
    if (brokerId !== 'paper' && req.user.subscriptionTier !== 'PRO') {
        return res.status(403).json({
            error: 'Connecting live broker adapters requires an Institutional Pro plan.',
            requiredTier: 'PRO',
            currentTier: req.user.subscriptionTier,
        });
    }
    engine_js_1.tradingService.setActiveBroker(brokerId);
    res.json({
        success: true,
        activeBroker: engine_js_1.tradingService.activeBroker.getInfo(),
    });
});
router.post('/connect', auth_js_1.requireAuth, (0, auth_js_1.requireSubscription)('PRO'), async (req, res) => {
    const { brokerType, credentials } = req.body;
    try {
        let adapter;
        if (brokerType === 'alpaca')
            adapter = engine_js_1.tradingService.alpacaBroker;
        else if (brokerType === 'oanda')
            adapter = engine_js_1.tradingService.oandaBroker;
        else if (brokerType === 'ibkr')
            adapter = engine_js_1.tradingService.ibkrBroker;
        else
            return res.status(400).json({ error: 'Invalid broker type' });
        await adapter.connect(credentials);
        // Record connection status in database (without plain text secrets)
        await client_js_1.prisma.brokerConnection.upsert({
            where: {
                userId_brokerType: {
                    userId: req.user.id,
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
                userId: req.user.id,
                brokerType,
                status: adapter.isConnected() ? 'CONNECTED' : 'NOT_CONFIGURED',
                lastSync: new Date(),
                environment: credentials.env || 'sandbox',
                accountId: credentials.accountId || credentials.keyId || 'CONNECTED-ACC',
            },
        });
        await client_js_1.prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'BROKER_CONNECTED',
                category: 'BROKER',
                details: `Connected to ${brokerType} in ${credentials.env || 'sandbox'} environment`,
                level: 'INFO',
            },
        });
        res.json({ success: true, info: adapter.getInfo() });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/disconnect', auth_js_1.requireAuth, async (req, res) => {
    const { brokerType } = req.body;
    if (brokerType === 'alpaca')
        await engine_js_1.tradingService.alpacaBroker.disconnect();
    else if (brokerType === 'oanda')
        await engine_js_1.tradingService.oandaBroker.disconnect();
    else if (brokerType === 'ibkr')
        await engine_js_1.tradingService.ibkrBroker.disconnect();
    if (engine_js_1.tradingService.activeBroker.id === brokerType) {
        engine_js_1.tradingService.setActiveBroker('paper');
    }
    res.json({ success: true, message: `${brokerType} disconnected.` });
});
exports.default = router;
