import { Router } from 'express';
import { INSTRUMENT_LIST, getInstrument } from '@harsi/shared';
import { getSessionState } from '@harsi/market-data';
import { tradingService } from '../services/engine.js';

const router = Router();

router.get('/symbols', (req, res) => {
  res.json({ instruments: INSTRUMENT_LIST });
});

router.get('/candles/:symbol', (req, res) => {
  const { symbol } = req.params;
  const candles = tradingService.feed.getCandles(symbol.toUpperCase());
  res.json({ symbol: symbol.toUpperCase(), candles });
});

router.get('/tick/:symbol', (req, res) => {
  const { symbol } = req.params;
  const tick = tradingService.feed.getLatestTick(symbol.toUpperCase());
  res.json({ tick });
});

router.get('/sessions', (req, res) => {
  const session = getSessionState(new Date(), tradingService.forceLondonWindow);
  res.json({ session, forceLondonWindow: tradingService.forceLondonWindow });
});

router.post('/toggle-london-window', (req, res) => {
  tradingService.forceLondonWindow = !tradingService.forceLondonWindow;
  const session = getSessionState(new Date(), tradingService.forceLondonWindow);
  tradingService.broadcast({
    type: 'SESSION_UPDATE',
    payload: session,
  });
  res.json({ forceLondonWindow: tradingService.forceLondonWindow, session });
});

router.get('/calendar', (req, res) => {
  const minImpact = (req.query.impact as any) || 'ALL';
  const events = tradingService.economicCalendar.getEvents(minImpact);
  res.json({ events });
});

export default router;
