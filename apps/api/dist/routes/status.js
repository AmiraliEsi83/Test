"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const engine_js_1 = require("../services/engine.js");
const client_js_1 = require("../db/client.js");
const router = (0, express_1.Router)();
const startTime = Date.now();
router.get('/health', async (req, res) => {
    const startPing = Date.now();
    let dbStatus = 'ONLINE';
    try {
        await client_js_1.prisma.$queryRaw `SELECT 1`;
    }
    catch (err) {
        dbStatus = 'DEGRADED';
    }
    const latencyMs = Date.now() - startPing;
    const status = {
        api: dbStatus === 'ONLINE' ? 'ONLINE' : 'DEGRADED',
        marketData: 'CONNECTED',
        websocket: 'ACTIVE',
        strategyEngine: engine_js_1.tradingService.automationSettings.masterEmergencyStop ? 'PAUSED' : 'RUNNING',
        brokerPaper: engine_js_1.tradingService.paperBroker.isConnected() ? 'ACTIVE' : 'ERROR',
        brokerLive: engine_js_1.tradingService.alpacaBroker.isConnected() || engine_js_1.tradingService.oandaBroker.isConnected()
            ? 'CONNECTED'
            : 'NOT_CONFIGURED',
        latencyMs,
        activeSockets: engine_js_1.tradingService.wsClients?.size || 0,
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    };
    res.json({
        status,
        timestamp: new Date().toISOString(),
        version: '1.0.0-institutional',
    });
});
exports.default = router;
