"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractiveBrokersAdapter = void 0;
class InteractiveBrokersAdapter {
    id = 'ibkr';
    name = 'Interactive Brokers (CP Gateway)';
    mode = 'LIVE';
    host = '127.0.0.1';
    port = 5000;
    accountId = '';
    connected = false;
    constructor() {
        this.host = process.env.IBKR_GATEWAY_HOST || '127.0.0.1';
        this.port = Number(process.env.IBKR_GATEWAY_PORT || 5000);
        this.accountId = process.env.IBKR_ACCOUNT_ID || '';
    }
    async connect(credentials) {
        if (credentials) {
            this.host = credentials.host || '127.0.0.1';
            this.port = Number(credentials.port || 5000);
            this.accountId = credentials.accountId || '';
        }
        try {
            const res = await fetch(`https://${this.host}:${this.port}/v1/api/iserver/auth/status`, {
                signal: AbortSignal.timeout(3000),
            });
            if (res.ok) {
                this.connected = true;
            }
            else {
                this.connected = false;
                throw new Error('IBKR Gateway is not authenticated.');
            }
        }
        catch (err) {
            this.connected = false;
            throw new Error(`IBKR Client Portal Gateway unreachable at ${this.host}:${this.port}. Please launch your IB Gateway.`);
        }
    }
    async disconnect() {
        this.connected = false;
    }
    isConnected() {
        return this.connected;
    }
    getInfo() {
        return {
            id: 'ibkr',
            brokerType: 'ibkr',
            name: this.name,
            status: this.connected ? 'CONNECTED' : 'NOT_CONNECTED',
            environment: 'live',
            accountId: this.accountId || undefined,
            lastSync: this.connected ? new Date().toISOString() : undefined,
            hasCredentials: Boolean(this.accountId),
            permissions: ['multi-asset', 'smart-routing'],
        };
    }
    async getAccount() {
        return {
            brokerId: this.id,
            name: this.name,
            accountId: this.accountId || 'NOT_CONNECTED',
            currency: 'USD',
            balance: 0,
            equity: 0,
            cash: 0,
            buyingPower: 0,
            marginUsed: 0,
            unrealizedPnl: 0,
            realizedPnl: 0,
            mode: 'LIVE',
            status: this.connected ? 'CONNECTED' : 'NOT_CONNECTED',
        };
    }
    async getPositions() {
        return [];
    }
    async getOrders() {
        return [];
    }
    async placeOrder(request) {
        throw new Error('IBKR order execution requires active authenticated IB Client Portal Gateway.');
    }
    async cancelOrder(id) {
        throw new Error('IBKR Gateway not connected.');
    }
    async closePosition(id, lots) {
        throw new Error('IBKR Gateway not connected.');
    }
    async modifyPosition(id, stopLoss, takeProfit) {
        throw new Error('IBKR Gateway not connected.');
    }
}
exports.InteractiveBrokersAdapter = InteractiveBrokersAdapter;
