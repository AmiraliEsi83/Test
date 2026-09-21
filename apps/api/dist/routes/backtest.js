"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const strategies_1 = require("@harsi/strategies");
const auth_js_1 = require("../middleware/auth.js");
const engine_js_1 = require("../services/engine.js");
const client_js_1 = require("../db/client.js");
const router = (0, express_1.Router)();
router.post('/run', auth_js_1.requireAuth, (0, auth_js_1.requireSubscription)('TRADER'), async (req, res) => {
    try {
        const { strategyId = 'london-harsi', symbol = 'EURUSD', timeframe = '15m', startingBalance = 100000, riskPct = 1.0, params = {}, } = req.body;
        const strategy = strategies_1.defaultStrategyRegistry.get(strategyId);
        if (!strategy) {
            return res.status(404).json({ error: `Strategy ${strategyId} not found` });
        }
        // Generate or fetch 250 historical candles for backtesting
        const candles = engine_js_1.tradingService.feed.generateHistory(symbol.toUpperCase(), 250);
        const result = engine_js_1.tradingService.backtester.run(strategy, candles, {
            strategyId,
            symbol: symbol.toUpperCase(),
            timeframe,
            startDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            startingBalance: Number(startingBalance),
            riskPct: Number(riskPct),
            params,
        });
        // Save run to database
        try {
            await client_js_1.prisma.backtestRun.create({
                data: {
                    id: result.id,
                    userId: req.user.id,
                    strategyId: result.strategyId,
                    strategyName: result.strategyName,
                    symbol: result.symbol,
                    timeframe: result.timeframe,
                    startDate: result.startDate,
                    endDate: result.endDate,
                    startingBalance: result.startingBalance,
                    finalBalance: result.finalBalance,
                    netProfit: result.netProfit,
                    returnPct: result.returnPct,
                    totalTrades: result.totalTrades,
                    winningTrades: result.winningTrades,
                    losingTrades: result.losingTrades,
                    winRate: result.winRate,
                    profitFactor: result.profitFactor,
                    maxDrawdownPct: result.maxDrawdownPct,
                    averageTrade: result.averageTrade,
                    parameters: JSON.stringify(result.parameters),
                    resultJson: JSON.stringify(result),
                },
            });
        }
        catch (e) {
            // ignore
        }
        res.json({ result });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/history', auth_js_1.requireAuth, async (req, res) => {
    try {
        const runs = await client_js_1.prisma.backtestRun.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        res.json({ runs });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', auth_js_1.requireAuth, async (req, res) => {
    try {
        const run = await client_js_1.prisma.backtestRun.findUnique({
            where: { id: req.params.id },
        });
        if (!run)
            return res.status(404).json({ error: 'Backtest run not found' });
        res.json({ result: JSON.parse(run.resultJson) });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
