"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = require("ws");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const market_js_1 = __importDefault(require("./routes/market.js"));
const strategies_js_1 = __importDefault(require("./routes/strategies.js"));
const signals_js_1 = __importDefault(require("./routes/signals.js"));
const orders_js_1 = __importDefault(require("./routes/orders.js"));
const positions_js_1 = __importDefault(require("./routes/positions.js"));
const brokers_js_1 = __importDefault(require("./routes/brokers.js"));
const automation_js_1 = __importDefault(require("./routes/automation.js"));
const backtest_js_1 = __importDefault(require("./routes/backtest.js"));
const analytics_js_1 = __importDefault(require("./routes/analytics.js"));
const risk_js_1 = __importDefault(require("./routes/risk.js"));
const audit_js_1 = __importDefault(require("./routes/audit.js"));
const subscription_js_1 = __importDefault(require("./routes/subscription.js"));
const status_js_1 = __importDefault(require("./routes/status.js"));
const engine_js_1 = require("./services/engine.js");
const app = (0, express_1.default)();
exports.app = app;
const PORT = Number(process.env.PORT) || 5001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// API Routes
app.use('/api/auth', auth_js_1.default);
app.use('/api/market', market_js_1.default);
app.use('/api/strategies', strategies_js_1.default);
app.use('/api/signals', signals_js_1.default);
app.use('/api/orders', orders_js_1.default);
app.use('/api/positions', positions_js_1.default);
app.use('/api/brokers', brokers_js_1.default);
app.use('/api/automation', automation_js_1.default);
app.use('/api/backtest', backtest_js_1.default);
app.use('/api/analytics', analytics_js_1.default);
app.use('/api/risk', risk_js_1.default);
app.use('/api/audit', audit_js_1.default);
app.use('/api/subscription', subscription_js_1.default);
app.use('/api/status', status_js_1.default);
// Root health probe
app.get('/api', (req, res) => {
    res.json({
        service: 'HARSI Institutional AI Trading Platform API',
        version: '1.0.0',
        status: 'ONLINE',
    });
});
const server = http_1.default.createServer(app);
exports.server = server;
// WebSocket Server
const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
    engine_js_1.tradingService.registerClient(ws);
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.type === 'PING') {
                ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
            }
        }
        catch (e) {
            // ignore
        }
    });
    ws.on('close', () => {
        engine_js_1.tradingService.unregisterClient(ws);
    });
});
if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[HARSI Trading API] Listening on http://0.0.0.0:${PORT}`);
        console.log(`[HARSI WebSocket] Active on ws://0.0.0.0:${PORT}/ws`);
    });
}
