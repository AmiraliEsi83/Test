"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlpacaBrokerAdapter = void 0;
class AlpacaBrokerAdapter {
    id = 'alpaca';
    name = 'Alpaca Markets';
    mode = 'PAPER';
    keyId = '';
    secretKey = '';
    isPaper = true;
    connected = false;
    constructor() {
        this.keyId = process.env.ALPACA_API_KEY || '';
        this.secretKey = process.env.ALPACA_SECRET_KEY || '';
        this.isPaper = process.env.ALPACA_ENV !== 'live';
    }
    async connect(credentials) {
        if (credentials) {
            this.keyId = credentials.keyId || '';
            this.secretKey = credentials.secretKey || '';
            this.isPaper = credentials.env !== 'live';
        }
        if (!this.keyId || !this.secretKey) {
            this.connected = false;
            throw new Error('Alpaca API Key and Secret are required to connect.');
        }
        // In a real environment with credentials, we would call Alpaca's /v2/account
        // Test endpoint ping:
        try {
            const baseUrl = this.isPaper
                ? 'https://paper-api.alpaca.markets'
                : 'https://api.alpaca.markets';
            const res = await fetch(`${baseUrl}/v2/account`, {
                headers: {
                    'APCA-API-KEY-ID': this.keyId,
                    'APCA-API-SECRET-KEY': this.secretKey,
                },
            });
            if (!res.ok) {
                this.connected = false;
                throw new Error(`Alpaca authentication failed: ${res.statusText}`);
            }
            this.connected = true;
        }
        catch (err) {
            this.connected = false;
            throw new Error(`Alpaca connection failed: ${err.message}`);
        }
    }
    async disconnect() {
        this.connected = false;
    }
    isConnected() {
        return this.connected;
    }
    getInfo() {
        const hasCreds = Boolean(this.keyId && this.secretKey);
        return {
            id: 'alpaca',
            brokerType: 'alpaca',
            name: this.name,
            status: this.connected ? 'CONNECTED' : hasCreds ? 'NOT_CONNECTED' : 'NOT_CONFIGURED',
            environment: this.isPaper ? 'sandbox' : 'live',
            accountId: hasCreds ? 'ALPACA-LIVE-XXXX' : undefined,
            lastSync: this.connected ? new Date().toISOString() : undefined,
            hasCredentials: hasCreds,
            permissions: ['read', 'trade'],
        };
    }
    async getAccount() {
        if (!this.connected) {
            return {
                brokerId: this.id,
                name: this.name,
                accountId: 'UNCONFIGURED',
                currency: 'USD',
                balance: 0,
                equity: 0,
                cash: 0,
                buyingPower: 0,
                marginUsed: 0,
                unrealizedPnl: 0,
                realizedPnl: 0,
                mode: this.isPaper ? 'PAPER' : 'LIVE',
                status: 'NOT_CONFIGURED',
            };
        }
        const baseUrl = this.isPaper ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets';
        const res = await fetch(`${baseUrl}/v2/account`, {
            headers: {
                'APCA-API-KEY-ID': this.keyId,
                'APCA-API-SECRET-KEY': this.secretKey,
            },
        });
        const data = await res.json();
        return {
            brokerId: this.id,
            name: this.name,
            accountId: data.id || 'ALPACA-ACC',
            currency: data.currency || 'USD',
            balance: parseFloat(data.portfolio_value || 0),
            equity: parseFloat(data.equity || 0),
            cash: parseFloat(data.cash || 0),
            buyingPower: parseFloat(data.buying_power || 0),
            marginUsed: parseFloat(data.initial_margin || 0),
            unrealizedPnl: 0,
            realizedPnl: 0,
            mode: this.isPaper ? 'PAPER' : 'LIVE',
            status: 'CONNECTED',
        };
    }
    async getPositions() {
        if (!this.connected)
            return [];
        return [];
    }
    async getOrders() {
        if (!this.connected)
            return [];
        return [];
    }
    async placeOrder(request) {
        if (!this.connected) {
            throw new Error('Alpaca broker is not connected or configured with live credentials.');
        }
        throw new Error('Live Alpaca execution requires validated API credentials.');
    }
    async cancelOrder(id) {
        if (!this.connected)
            throw new Error('Alpaca broker not connected.');
    }
    async closePosition(id, lots) {
        if (!this.connected)
            throw new Error('Alpaca broker not connected.');
    }
    async modifyPosition(id, stopLoss, takeProfit) {
        if (!this.connected)
            throw new Error('Alpaca broker not connected.');
        throw new Error('Position not found');
    }
}
exports.AlpacaBrokerAdapter = AlpacaBrokerAdapter;
