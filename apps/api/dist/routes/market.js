"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shared_1 = require("@harsi/shared");
const market_data_1 = require("@harsi/market-data");
const engine_js_1 = require("../services/engine.js");
const router = (0, express_1.Router)();
router.get('/symbols', (req, res) => {
    res.json({ instruments: shared_1.INSTRUMENT_LIST });
});
router.get('/candles/:symbol', (req, res) => {
    const { symbol } = req.params;
    const candles = engine_js_1.tradingService.feed.getCandles(symbol.toUpperCase());
    res.json({ symbol: symbol.toUpperCase(), candles });
});
router.get('/tick/:symbol', (req, res) => {
    const { symbol } = req.params;
    const tick = engine_js_1.tradingService.feed.getLatestTick(symbol.toUpperCase());
    res.json({ tick });
});
router.get('/sessions', (req, res) => {
    const session = (0, market_data_1.getSessionState)(new Date(), engine_js_1.tradingService.forceLondonWindow);
    res.json({ session, forceLondonWindow: engine_js_1.tradingService.forceLondonWindow });
});
router.post('/toggle-london-window', (req, res) => {
    engine_js_1.tradingService.forceLondonWindow = !engine_js_1.tradingService.forceLondonWindow;
    const session = (0, market_data_1.getSessionState)(new Date(), engine_js_1.tradingService.forceLondonWindow);
    engine_js_1.tradingService.broadcast({
        type: 'SESSION_UPDATE',
        payload: session,
    });
    res.json({ forceLondonWindow: engine_js_1.tradingService.forceLondonWindow, session });
});
router.get('/calendar', (req, res) => {
    const minImpact = req.query.impact || 'ALL';
    const events = engine_js_1.tradingService.economicCalendar.getEvents(minImpact);
    res.json({ events });
});
exports.default = router;
