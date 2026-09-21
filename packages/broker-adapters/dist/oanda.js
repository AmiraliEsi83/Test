export class OandaBrokerAdapter {
    id = 'oanda';
    name = 'OANDA FX & Metals';
    mode = 'LIVE';
    accountId = '';
    apiToken = '';
    environment = 'practice';
    connected = false;
    constructor() {
        this.accountId = process.env.OANDA_ACCOUNT_ID || '';
        this.apiToken = process.env.OANDA_API_TOKEN || '';
        this.environment = process.env.OANDA_ENV || 'practice';
    }
    async connect(credentials) {
        if (credentials) {
            this.accountId = credentials.accountId || '';
            this.apiToken = credentials.apiToken || '';
            this.environment = credentials.env || 'practice';
        }
        if (!this.accountId || !this.apiToken) {
            this.connected = false;
            throw new Error('OANDA Account ID and Bearer API Token are required.');
        }
        const host = this.environment === 'live' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com';
        try {
            const res = await fetch(`${host}/v3/accounts/${this.accountId}/summary`, {
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok) {
                this.connected = false;
                throw new Error(`OANDA authorization failed: ${res.statusText}`);
            }
            this.connected = true;
        }
        catch (err) {
            this.connected = false;
            throw new Error(`OANDA connection failed: ${err.message}`);
        }
    }
    async disconnect() {
        this.connected = false;
    }
    isConnected() {
        return this.connected;
    }
    getInfo() {
        const hasCreds = Boolean(this.accountId && this.apiToken);
        return {
            id: 'oanda',
            brokerType: 'oanda',
            name: this.name,
            status: this.connected ? 'CONNECTED' : hasCreds ? 'NOT_CONNECTED' : 'NOT_CONFIGURED',
            environment: this.environment === 'live' ? 'live' : 'sandbox',
            accountId: hasCreds ? this.accountId : undefined,
            lastSync: this.connected ? new Date().toISOString() : undefined,
            hasCredentials: hasCreds,
            permissions: ['fx-trade', 'streaming-pricing'],
        };
    }
    async getAccount() {
        return {
            brokerId: this.id,
            name: this.name,
            accountId: this.accountId || 'NOT_CONFIGURED',
            currency: 'USD',
            balance: 0,
            equity: 0,
            cash: 0,
            buyingPower: 0,
            marginUsed: 0,
            unrealizedPnl: 0,
            realizedPnl: 0,
            mode: 'LIVE',
            status: this.connected ? 'CONNECTED' : 'NOT_CONFIGURED',
        };
    }
    async getPositions() {
        return [];
    }
    async getOrders() {
        return [];
    }
    async placeOrder(request) {
        throw new Error('OANDA live execution requires configured API token and active account authorization.');
    }
    async cancelOrder(id) {
        throw new Error('OANDA broker not connected.');
    }
    async closePosition(id, lots) {
        throw new Error('OANDA broker not connected.');
    }
    async modifyPosition(id, stopLoss, takeProfit) {
        throw new Error('OANDA broker not connected.');
    }
}
