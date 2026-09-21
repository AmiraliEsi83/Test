"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBSCRIPTION_PLANS = exports.DEFAULT_AUTOMATION_SETTINGS = exports.DEFAULT_RISK_SETTINGS = void 0;
exports.DEFAULT_RISK_SETTINGS = {
    maxRiskPerTradePct: 1.0,
    maxPositionSizeLots: 5.0,
    maxDailyLossUsd: 2500,
    maxDailyLossPct: 3.0,
    maxOpenPositions: 5,
    maxExposurePerAssetLots: 2.0,
    consecutiveLossThreshold: 3,
    cooldownMinutes: 120,
    killSwitchActive: false,
};
exports.DEFAULT_AUTOMATION_SETTINGS = {
    strategies: {
        'london-harsi': {
            alerts: true,
            paperAutoExecute: true,
            liveAutoExecute: false,
            confirmedLiveRisk: false,
        },
        'pulse-confluence': {
            alerts: true,
            paperAutoExecute: false,
            liveAutoExecute: false,
            confirmedLiveRisk: false,
        },
        'breakout-trend': {
            alerts: true,
            paperAutoExecute: false,
            liveAutoExecute: false,
            confirmedLiveRisk: false,
        },
    },
    masterEmergencyStop: false,
};
exports.SUBSCRIPTION_PLANS = {
    FREE: {
        id: 'FREE',
        name: 'Free Starter',
        price: 0,
        interval: 'month',
        features: [
            'Live TradingView-grade interactive chart',
            'Watchlist & multi-asset quotes',
            'Delayed/basic HARSI and Pulse signals',
            'Manual paper trading execution ($100k account)',
            'Basic position and order ledger',
            '1 active strategy monitor',
        ],
        maxStrategies: 1,
        brokerIntegration: false,
        liveAutomation: false,
        backtestingRunsPerDay: 3,
    },
    TRADER: {
        id: 'TRADER',
        name: 'Trader Pro',
        price: 49,
        interval: 'month',
        popular: true,
        features: [
            'Instant real-time London HARSI & Pulse alerts',
            'Breakout + Trend Confirmation institutional algo',
            'Automated paper trade execution pipeline',
            'Advanced analytics (Sharpe, equity curve, win/loss)',
            'Full event-driven backtesting engine (unlimited)',
            'Configurable risk manager & stop-loss protections',
            'Browser audio & desktop notifications',
        ],
        maxStrategies: 5,
        brokerIntegration: false,
        liveAutomation: false,
        backtestingRunsPerDay: 100,
    },
    PRO: {
        id: 'PRO',
        name: 'Institutional Pro',
        price: 149,
        interval: 'month',
        features: [
            'Everything in Trader Pro',
            'Live broker adapter integrations (Alpaca, OANDA, IBKR)',
            'Automated live broker order routing with kill switch',
            'Webhook & Telegram signal relay integration',
            'Multi-broker portfolio balancing & risk limits',
            'Direct priority institutional server feed',
            '24/7 dedicated support & strategy consulting',
        ],
        maxStrategies: 20,
        brokerIntegration: true,
        liveAutomation: true,
        backtestingRunsPerDay: 1000,
    },
};
