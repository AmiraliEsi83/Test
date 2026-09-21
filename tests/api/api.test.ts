import request from 'supertest';
import { app, server } from '../../apps/api/src/server.js';
import { tradingService } from '../../apps/api/src/services/engine.js';
import { prisma } from '../../apps/api/src/db/client.js';

describe('Public & Market API Endpoints', () => {
  afterAll(async () => {
    tradingService.stopStreaming();
    await prisma.$disconnect();
    if (server && server.close) {
      server.close();
    }
  });

  test('GET /api/status/health returns system operational status', async () => {
    const res = await request(app).get('/api/status/health');
    expect(res.status).toBe(200);
    expect(res.body.status.api).toBe('ONLINE');
    expect(res.body.status.marketData).toBe('CONNECTED');
    expect(res.body.status.brokerPaper).toBe('ACTIVE');
  });

  test('GET /api/market/symbols returns supported trading instruments', async () => {
    const res = await request(app).get('/api/market/symbols');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.instruments)).toBe(true);
    expect(res.body.instruments.length).toBeGreaterThanOrEqual(8);

    const symbols = res.body.instruments.map((i: any) => i.symbol);
    expect(symbols).toContain('EURUSD');
    expect(symbols).toContain('BTCUSD');
    expect(symbols).toContain('SPY');
  });

  test('GET /api/market/sessions returns global session and HARSI window status', async () => {
    const res = await request(app).get('/api/market/sessions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('session');
    expect(res.body.session).toHaveProperty('name');
    expect(res.body.session).toHaveProperty('inHarsiWindow');
  });

  test('GET /api/strategies/list returns available pluggable algorithms', async () => {
    const res = await request(app).get('/api/strategies/list');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.strategies)).toBe(true);
    const ids = res.body.strategies.map((s: any) => s.id);
    expect(ids).toContain('london-harsi');
    expect(ids).toContain('pulse-confluence');
    expect(ids).toContain('breakout-trend');
  });

  test('POST /api/auth/login with demo credentials authenticates and issues JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'trader@harsi.ai', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('trader@harsi.ai');
    expect(res.body.user.subscriptionTier).toBe('TRADER');
  });
});
