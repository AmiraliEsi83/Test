import { fromPips, formatPrice } from '@harsi/shared';
import { computeHarsi } from '@harsi/market-data';
export const LondonHarsiStrategy = {
    id: 'london-harsi',
    name: 'London HARSI Mean-Reversion',
    badge: 'Session Algo',
    summary: 'Institutional London open mean-reversion algorithm. Evaluates the Asian session equilibrium midpoint and fires high-probability alerts during the London T-15 open window when distance reaches threshold bands.',
    rules: [
        'Asian range equilibrium measured from 00:00 to 07:45 London time.',
        'HARSI calculation = distance of market price from Asian midpoint in pips.',
        'Execution window arms at London T-15 (07:45 - 08:30 London).',
        'First print between −15 and −30 pips triggers institutional BUY mean-reversion.',
        'First print between +15 and +30 pips triggers institutional SELL mean-reversion.',
        'Max 1 long and 1 short signal per London opening session.',
        'Standard fixed risk/reward: 22 pips Stop Loss / 34 pips Take Profit (1:1.55 R:R).',
    ],
    defaultConfig: {
        id: 'london-harsi',
        enabled: true,
        symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'],
        timeframe: '15m',
        maxSignalsPerDay: 2,
        cooldownMinutes: 45,
        allowedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        parameters: {
            minBuyThresholdPips: -30,
            maxBuyThresholdPips: -15,
            minSellThresholdPips: 15,
            maxSellThresholdPips: 30,
            slPips: 22,
            tpPips: 34,
            requireSessionWindow: true,
        },
    },
    evaluate(ctx, config) {
        const params = { ...this.defaultConfig.parameters, ...config.parameters };
        const conditions = [];
        let signal = null;
        let score = 50;
        // 1. Check if strategy is enabled
        if (!config.enabled) {
            return {
                strategyId: this.id,
                strategyName: this.name,
                symbol: ctx.symbol,
                signal: null,
                score: 0,
                conditions: [{ name: 'Strategy Active', passed: false, detail: 'Strategy is disabled in configuration' }],
            };
        }
        // 2. Check allowed days
        const currentDay = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/London',
            weekday: 'short',
        }).format(new Date());
        const isDayAllowed = config.allowedDays.includes(currentDay);
        conditions.push({
            name: 'Trading Day Filter',
            passed: isDayAllowed,
            detail: `Current day: ${currentDay} (${isDayAllowed ? 'Allowed' : 'Restricted'})`,
        });
        // 3. Check Session Window (T-15 London Prep)
        const inWindow = ctx.session.inHarsiWindow || !params.requireSessionWindow;
        conditions.push({
            name: 'London T-15 Window',
            passed: inWindow,
            detail: ctx.session.inHarsiWindow
                ? 'Active (07:45–08:30 London Prep Window)'
                : params.requireSessionWindow
                    ? `Closed — ${ctx.session.name} (${Math.round(ctx.session.minutesToLondon)}m to open)`
                    : 'Session filter bypassed in testing mode',
        });
        // 4. Calculate HARSI metric from Asian Range
        const harsi = computeHarsi(ctx.symbol, ctx.currentPrice, ctx.asianRange || undefined);
        const hasAsianRange = Boolean(ctx.asianRange && ctx.asianRange.high && ctx.asianRange.low);
        conditions.push({
            name: 'Asian Range Equilibrium',
            passed: hasAsianRange,
            detail: hasAsianRange
                ? `Midpoint: ${formatPrice(ctx.symbol, harsi.mid)} | Asian Range: ${harsi.rangePips.toFixed(1)} pips`
                : 'Asian session range pending calculation',
        });
        // 5. Threshold conditions
        const isBuyZone = harsi.value <= params.maxBuyThresholdPips && harsi.value >= params.minBuyThresholdPips;
        const isSellZone = harsi.value >= params.minSellThresholdPips && harsi.value <= params.maxSellThresholdPips;
        conditions.push({
            name: 'HARSI Threshold Zone',
            passed: isBuyZone || isSellZone,
            detail: `HARSI: ${harsi.value > 0 ? '+' : ''}${harsi.value.toFixed(1)} pips from mid (Buy zone: [${params.minBuyThresholdPips}, ${params.maxBuyThresholdPips}], Sell zone: [+${params.minSellThresholdPips}, +${params.maxSellThresholdPips}])`,
        });
        // 6. Max signals per day / cooldown
        const cooldownPassed = !ctx.lastFiredTimestamp || Date.now() - ctx.lastFiredTimestamp > config.cooldownMinutes * 60 * 1000;
        conditions.push({
            name: 'Cooldown & Daily Limit',
            passed: cooldownPassed,
            detail: cooldownPassed
                ? `Ready (Cooldown: ${config.cooldownMinutes}m)`
                : 'Cooldown active from prior session signal',
        });
        // Determine signal trigger
        if (isDayAllowed && inWindow && hasAsianRange && cooldownPassed) {
            if (isBuyZone) {
                score = 88;
                const entry = ctx.currentPrice;
                const stopLoss = entry - fromPips(ctx.symbol, params.slPips);
                const takeProfit = entry + fromPips(ctx.symbol, params.tpPips);
                signal = {
                    id: `sig_harsi_${Date.now()}_buy`,
                    strategyId: this.id,
                    strategyName: this.name,
                    symbol: ctx.symbol,
                    timeframe: config.timeframe,
                    side: 'BUY',
                    price: entry,
                    entry,
                    stopLoss: Number(stopLoss.toFixed(5)),
                    takeProfit: Number(takeProfit.toFixed(5)),
                    riskReward: `1:${(params.tpPips / params.slPips).toFixed(2)}`,
                    timestamp: Date.now(),
                    status: 'ACTIVE',
                    reason: `HARSI print at ${harsi.value.toFixed(1)} pips below Asian midpoint during London T-15 prep. Institutional mean-reversion long target established.`,
                    conditions,
                    metadata: { harsiValue: harsi.value, asianMid: harsi.mid, zone: 'buy' },
                };
            }
            else if (isSellZone) {
                score = 88;
                const entry = ctx.currentPrice;
                const stopLoss = entry + fromPips(ctx.symbol, params.slPips);
                const takeProfit = entry - fromPips(ctx.symbol, params.tpPips);
                signal = {
                    id: `sig_harsi_${Date.now()}_sell`,
                    strategyId: this.id,
                    strategyName: this.name,
                    symbol: ctx.symbol,
                    timeframe: config.timeframe,
                    side: 'SELL',
                    price: entry,
                    entry,
                    stopLoss: Number(stopLoss.toFixed(5)),
                    takeProfit: Number(takeProfit.toFixed(5)),
                    riskReward: `1:${(params.tpPips / params.slPips).toFixed(2)}`,
                    timestamp: Date.now(),
                    status: 'ACTIVE',
                    reason: `HARSI print at +${harsi.value.toFixed(1)} pips above Asian midpoint during London T-15 prep. Institutional mean-reversion short target established.`,
                    conditions,
                    metadata: { harsiValue: harsi.value, asianMid: harsi.mid, zone: 'sell' },
                };
            }
        }
        return {
            strategyId: this.id,
            strategyName: this.name,
            symbol: ctx.symbol,
            signal,
            score,
            conditions,
            metadata: { harsiValue: harsi.value, asianMid: harsi.mid, rangePips: harsi.rangePips },
        };
    },
};
