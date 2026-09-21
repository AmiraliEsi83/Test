import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.js';
import marketRoutes from './routes/market.js';
import strategiesRoutes from './routes/strategies.js';
import signalsRoutes from './routes/signals.js';
import ordersRoutes from './routes/orders.js';
import positionsRoutes from './routes/positions.js';
import brokersRoutes from './routes/brokers.js';
import automationRoutes from './routes/automation.js';
import backtestRoutes from './routes/backtest.js';
import analyticsRoutes from './routes/analytics.js';
import riskRoutes from './routes/risk.js';
import auditRoutes from './routes/audit.js';
import subscriptionRoutes from './routes/subscription.js';
import statusRoutes from './routes/status.js';
import { tradingService } from './services/engine.js';

const app = express();
const PORT = Number(process.env.PORT) || 5001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/strategies', strategiesRoutes);
app.use('/api/signals', signalsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/brokers', brokersRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/backtest', backtestRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/status', statusRoutes);

// Root health probe
app.get('/api', (req, res) => {
  res.json({
    service: 'HARSI Institutional AI Trading Platform API',
    version: '1.0.0',
    status: 'ONLINE',
  });
});

const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  tradingService.registerClient(ws);

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (e) {
      // ignore
    }
  });

  ws.on('close', () => {
    tradingService.unregisterClient(ws);
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[HARSI Trading API] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[HARSI WebSocket] Active on ws://0.0.0.0:${PORT}/ws`);
  });
}

export { app, server };
export default app;
