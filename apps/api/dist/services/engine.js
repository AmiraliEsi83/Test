"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradingService = exports.TradingService = void 0;
const ws_1 = require("ws");
const shared_1 = require("@harsi/shared");
const market_data_1 = require("@harsi/market-data");
const strategies_1 = require("@harsi/strategies");
const broker_adapters_1 = require("@harsi/broker-adapters");
const trading_engine_1 = require("@harsi/trading-engine");
const client_js_1 = require("../db/client.js");
class TradingService {
    feed;
    paperBroker;
    alpacaBroker;
    oandaBroker;
    ibkrBroker;
    activeBroker;
    riskManager;
    orderManager;
    executionPipeline;
    backtester;
    economicCalendar;
    automationSettings;
    wsClients = new Set();
    tickInterval = null;
    activeSignals = new Map();
    lastFiredByStrategy = new Map();
    forceLondonWindow = true; // Enabled for interactive testing so London signals fire
    constructor() {
        this.feed = new market_data_1.MockMarketFeed();
        this.paperBroker = new broker_adapters_1.PaperBrokerAdapter(100000);
        this.alpacaBroker = new broker_adapters_1.AlpacaBrokerAdapter();
        this.oandaBroker = new broker_adapters_1.OandaBrokerAdapter();
        this.ibkrBroker = new broker_adapters_1.InteractiveBrokersAdapter();
        this.activeBroker = this.paperBroker;
        this.riskManager = new trading_engine_1.RiskManager();
        this.automationSettings = {
            userId: 'user-default',
            ...shared_1.DEFAULT_AUTOMATION_SETTINGS,
        };
        this.orderManager = new trading_engine_1.OrderManager(this.activeBroker, this.riskManager, async (entry) => {
            try {
                await client_js_1.prisma.auditLog.create({
                    data: {
                        action: entry.action,
                        category: entry.category,
                        details: entry.details,
                        level: entry.level,
                    },
                });
            }
            catch (err) {
                console.error('Failed to write audit log:', err);
            }
        });
        this.executionPipeline = new trading_engine_1.ExecutionPipeline(this.orderManager, this.automationSettings, (signal) => {
            this.broadcast({ type: 'SIGNAL', payload: signal });
        });
        this.backtester = new trading_engine_1.BacktestingEngine();
        this.economicCalendar = new market_data_1.EconomicCalendarService();
        this.startStreaming();
    }
    registerClient(ws) {
        this.wsClients.add(ws);
        // Send initial snapshot
        ws.send(JSON.stringify({
            type: 'INITIAL_STATE',
            payload: {
                session: (0, market_data_1.getSessionState)(new Date(), this.forceLondonWindow),
                activeSignals: Array.from(this.activeSignals.values()),
                brokerInfo: this.activeBroker.getInfo(),
            },
        }));
    }
    unregisterClient(ws) {
        this.wsClients.delete(ws);
    }
    broadcast(message) {
        const data = JSON.stringify(message);
        for (const ws of this.wsClients) {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                try {
                    ws.send(data);
                }
                catch (e) {
                    /* ignore failed client send */
                }
            }
        }
    }
    setActiveBroker(brokerId) {
        if (brokerId === 'alpaca')
            this.activeBroker = this.alpacaBroker;
        else if (brokerId === 'oanda')
            this.activeBroker = this.oandaBroker;
        else if (brokerId === 'ibkr')
            this.activeBroker = this.ibkrBroker;
        else
            this.activeBroker = this.paperBroker;
        this.orderManager.setBroker(this.activeBroker);
        this.broadcast({
            type: 'BROKER_CHANGED',
            payload: this.activeBroker.getInfo(),
        });
    }
    startStreaming() {
        if (this.tickInterval)
            clearInterval(this.tickInterval);
        this.tickInterval = setInterval(() => {
            const now = new Date();
            const session = (0, market_data_1.getSessionState)(now, this.forceLondonWindow);
            const prices = {};
            for (const inst of shared_1.INSTRUMENT_LIST) {
                const { tick, candle } = this.feed.nextTick(inst.symbol, session.volatilityMultiplier);
                prices[inst.symbol] = tick.price;
                this.broadcast({
                    type: 'TICK',
                    payload: {
                        symbol: inst.symbol,
                        tick,
                        candle,
                    },
                });
                // Evaluate strategies periodically
                this.evaluateStrategiesForSymbol(inst.symbol, tick.price, session);
            }
            // Update paper positions mark to market
            this.paperBroker.updatePrices(prices);
        }, 1200);
    }
    async evaluateStrategiesForSymbol(symbol, currentPrice, session) {
        const candles = this.feed.getCandles(symbol);
        const asianRange = (0, market_data_1.extractAsianRange)(candles);
        for (const strategy of strategies_1.defaultStrategyRegistry.getAll()) {
            const lastFired = this.lastFiredByStrategy.get(`${strategy.id}:${symbol}`) || 0;
            const evalResult = strategy.evaluate({
                symbol,
                timeframe: '15m',
                candles,
                currentPrice,
                session,
                asianRange,
                lastFiredTimestamp: lastFired,
            }, strategy.defaultConfig);
            if (evalResult.signal) {
                const sig = evalResult.signal;
                this.activeSignals.set(sig.id, sig);
                this.lastFiredByStrategy.set(`${strategy.id}:${symbol}`, Date.now());
                // Save signal to database
                try {
                    await client_js_1.prisma.signal.create({
                        data: {
                            id: sig.id,
                            strategyId: sig.strategyId,
                            strategyName: sig.strategyName,
                            symbol: sig.symbol,
                            timeframe: sig.timeframe,
                            side: sig.side,
                            price: sig.price,
                            entry: sig.entry,
                            stopLoss: sig.stopLoss,
                            takeProfit: sig.takeProfit,
                            riskReward: sig.riskReward,
                            timestamp: BigInt(sig.timestamp),
                            status: sig.status,
                            reason: sig.reason,
                            conditions: JSON.stringify(sig.conditions),
                            metadata: sig.metadata ? JSON.stringify(sig.metadata) : null,
                        },
                    });
                }
                catch (e) {
                    // ignore duplicate id
                }
                // Process through execution pipeline
                await this.executionPipeline.processSignal(sig);
            }
        }
    }
    getActiveSignals() {
        return Array.from(this.activeSignals.values()).slice(-20);
    }
}
exports.TradingService = TradingService;
exports.tradingService = new TradingService();
