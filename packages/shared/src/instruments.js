"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSTRUMENT_LIST = exports.INSTRUMENTS = void 0;
exports.getInstrument = getInstrument;
exports.toPips = toPips;
exports.fromPips = fromPips;
exports.formatPrice = formatPrice;
exports.calcPnl = calcPnl;
exports.INSTRUMENTS = {
    EURUSD: {
        id: 'EURUSD',
        symbol: 'EURUSD',
        label: 'EUR/USD',
        pip: 0.0001,
        digits: 5,
        basePrice: 1.0854,
        spread: 0.00012,
        kind: 'fx',
        lotSize: 100000,
        tvSymbol: 'FX:EURUSD',
        minLot: 0.01,
        maxLot: 50.0,
    },
    GBPUSD: {
        id: 'GBPUSD',
        symbol: 'GBPUSD',
        label: 'GBP/USD',
        pip: 0.0001,
        digits: 5,
        basePrice: 1.2725,
        spread: 0.00016,
        kind: 'fx',
        lotSize: 100000,
        tvSymbol: 'FX:GBPUSD',
        minLot: 0.01,
        maxLot: 50.0,
    },
    USDJPY: {
        id: 'USDJPY',
        symbol: 'USDJPY',
        label: 'USD/JPY',
        pip: 0.01,
        digits: 3,
        basePrice: 154.25,
        spread: 0.014,
        kind: 'fx',
        lotSize: 100000,
        tvSymbol: 'FX:USDJPY',
        minLot: 0.01,
        maxLot: 50.0,
    },
    XAUUSD: {
        id: 'XAUUSD',
        symbol: 'XAUUSD',
        label: 'XAU/USD (Gold)',
        pip: 0.1,
        digits: 2,
        basePrice: 2580.4,
        spread: 0.25,
        kind: 'metal',
        lotSize: 100,
        tvSymbol: 'OANDA:XAUUSD',
        minLot: 0.01,
        maxLot: 20.0,
    },
    BTCUSD: {
        id: 'BTCUSD',
        symbol: 'BTCUSD',
        label: 'BTC/USD',
        pip: 1.0,
        digits: 2,
        basePrice: 65200.0,
        spread: 5.0,
        kind: 'crypto',
        lotSize: 1,
        tvSymbol: 'BINANCE:BTCUSDT',
        minLot: 0.001,
        maxLot: 10.0,
    },
    ETHUSD: {
        id: 'ETHUSD',
        symbol: 'ETHUSD',
        label: 'ETH/USD',
        pip: 0.1,
        digits: 2,
        basePrice: 3450.0,
        spread: 0.5,
        kind: 'crypto',
        lotSize: 1,
        tvSymbol: 'BINANCE:ETHUSDT',
        minLot: 0.01,
        maxLot: 50.0,
    },
    SPY: {
        id: 'SPY',
        symbol: 'SPY',
        label: 'SPDR S&P 500 ETF (SPY)',
        pip: 0.01,
        digits: 2,
        basePrice: 565.4,
        spread: 0.03,
        kind: 'indices',
        lotSize: 1,
        tvSymbol: 'AMEX:SPY',
        minLot: 1,
        maxLot: 1000,
    },
    QQQ: {
        id: 'QQQ',
        symbol: 'QQQ',
        label: 'Invesco QQQ Trust (QQQ)',
        pip: 0.01,
        digits: 2,
        basePrice: 485.8,
        spread: 0.03,
        kind: 'indices',
        lotSize: 1,
        tvSymbol: 'NASDAQ:QQQ',
        minLot: 1,
        maxLot: 1000,
    },
};
exports.INSTRUMENT_LIST = Object.values(exports.INSTRUMENTS);
function getInstrument(symbol) {
    const norm = symbol.toUpperCase().replace('/', '').replace('-', '');
    return exports.INSTRUMENTS[norm] || exports.INSTRUMENTS['EURUSD'];
}
function toPips(symbol, delta) {
    const inst = getInstrument(symbol);
    return Math.round((delta / inst.pip) * 10) / 10;
}
function fromPips(symbol, pips) {
    const inst = getInstrument(symbol);
    return pips * inst.pip;
}
function formatPrice(symbol, price) {
    if (price == null || isNaN(price))
        return '—';
    const inst = getInstrument(symbol);
    return Number(price).toFixed(inst.digits);
}
function calcPnl(symbol, side, entry, current, lots) {
    const inst = getInstrument(symbol);
    const isBuy = side === 'LONG' || side === 'BUY';
    const priceDiff = isBuy ? current - entry : entry - current;
    const pnlPips = toPips(symbol, priceDiff);
    let pnlUsd = 0;
    if (inst.kind === 'crypto' || inst.kind === 'indices') {
        pnlUsd = priceDiff * lots;
    }
    else if (inst.kind === 'metal') {
        pnlUsd = (priceDiff / inst.pip) * lots * 1.0;
    }
    else {
        // Standard FX lot (100k) has $10/pip for EURUSD, GBPUSD, etc.
        pnlUsd = (priceDiff / inst.pip) * lots * 10.0;
    }
    return {
        pnlUsd: Math.round(pnlUsd * 100) / 100,
        pnlPips,
    };
}
