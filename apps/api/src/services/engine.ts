import { WebSocket } from 'ws';
import {
  DEFAULT_AUTOMATION_SETTINGS,
  DEFAULT_RISK_SETTINGS,
  AutomationSettings,
  Signal,
  INSTRUMENT_LIST,
  getInstrument,
} from '@harsi/shared';
import { MockMarketFeed, getSessionState, extractAsianRange, EconomicCalendarService } from '@harsi/market-data';
import { defaultStrategyRegistry } from '@harsi/strategies';
import {
  PaperBrokerAdapter,
  AlpacaBrokerAdapter,
  OandaBrokerAdapter,
  InteractiveBrokersAdapter,
  BrokerAdapter,
} from '@harsi/broker-adapters';
import {
  RiskManager,
  OrderManager,
  ExecutionPipeline,
  BacktestingEngine,
} from '@harsi/trading-engine';
import { prisma } from '../db/client.js';

export class TradingService {
  public feed: MockMarketFeed;
  public paperBroker: PaperBrokerAdapter;
  public alpacaBroker: AlpacaBrokerAdapter;
  public oandaBroker: OandaBrokerAdapter;
  public ibkrBroker: InteractiveBrokersAdapter;
  public activeBroker: BrokerAdapter;

  public riskManager: RiskManager;
  public orderManager: OrderManager;
  public executionPipeline: ExecutionPipeline;
  public backtester: BacktestingEngine;
  public economicCalendar: EconomicCalendarService;

  public automationSettings: AutomationSettings;
  private wsClients: Set<WebSocket> = new Set();
  private tickInterval: NodeJS.Timeout | null = null;
  private activeSignals: Map<string, Signal> = new Map();
  private lastFiredByStrategy: Map<string, number> = new Map();
  public forceLondonWindow: boolean = true; // Enabled for interactive testing so London signals fire

  constructor() {
    this.feed = new MockMarketFeed();
    this.paperBroker = new PaperBrokerAdapter(100000);
    this.alpacaBroker = new AlpacaBrokerAdapter();
    this.oandaBroker = new OandaBrokerAdapter();
    this.ibkrBroker = new InteractiveBrokersAdapter();
    this.activeBroker = this.paperBroker;

    this.riskManager = new RiskManager();
    this.automationSettings = {
      userId: 'user-default',
      ...DEFAULT_AUTOMATION_SETTINGS,
    };

    this.orderManager = new OrderManager(this.activeBroker, this.riskManager, async (entry) => {
      try {
        await prisma.auditLog.create({
          data: {
            action: entry.action,
            category: entry.category,
            details: entry.details,
            level: entry.level,
          },
        });
      } catch (err) {
        console.error('Failed to write audit log:', err);
      }
    });

    this.executionPipeline = new ExecutionPipeline(
      this.orderManager,
      this.automationSettings,
      (signal) => {
        this.broadcast({ type: 'SIGNAL', payload: signal });
      }
    );

    this.backtester = new BacktestingEngine();
    this.economicCalendar = new EconomicCalendarService();

    if (process.env.NODE_ENV !== 'test') {
      this.startStreaming();
    }
  }

  public stopStreaming(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  public registerClient(ws: WebSocket): void {
    this.wsClients.add(ws);
    // Send initial snapshot
    ws.send(
      JSON.stringify({
        type: 'INITIAL_STATE',
        payload: {
          session: getSessionState(new Date(), this.forceLondonWindow),
          activeSignals: Array.from(this.activeSignals.values()),
          brokerInfo: this.activeBroker.getInfo(),
        },
      })
    );
  }

  public unregisterClient(ws: WebSocket): void {
    this.wsClients.delete(ws);
  }

  public broadcast(message: any): void {
    const data = JSON.stringify(message);
    for (const ws of this.wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(data);
        } catch (e) {
          /* ignore failed client send */
        }
      }
    }
  }

  public setActiveBroker(brokerId: string): void {
    if (brokerId === 'alpaca') this.activeBroker = this.alpacaBroker;
    else if (brokerId === 'oanda') this.activeBroker = this.oandaBroker;
    else if (brokerId === 'ibkr') this.activeBroker = this.ibkrBroker;
    else this.activeBroker = this.paperBroker;

    this.orderManager.setBroker(this.activeBroker);
    this.broadcast({
      type: 'BROKER_CHANGED',
      payload: this.activeBroker.getInfo(),
    });
  }

  private startStreaming(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);

    this.tickInterval = setInterval(() => {
      const now = new Date();
      const session = getSessionState(now, this.forceLondonWindow);
      const prices: Record<string, number> = {};

      for (const inst of INSTRUMENT_LIST) {
        const { tick, candle } = this.feed.nextTick(inst.symbol, session.volatilityMultiplier);
        prices[inst.symbol] = tick.price;

        this.broadcast({
          type: 'TICK',
          payload: {
            symbol: inst.symbol,
            tick,
            candle,
          },
        });

        // Evaluate strategies periodically
        this.evaluateStrategiesForSymbol(inst.symbol, tick.price, session);
      }

      // Update paper positions mark to market
      this.paperBroker.updatePrices(prices);
    }, 1200);
  }

  private async evaluateStrategiesForSymbol(
    symbol: string,
    currentPrice: number,
    session: any
  ): Promise<void> {
    const candles = this.feed.getCandles(symbol);
    const asianRange = extractAsianRange(candles);

    for (const strategy of defaultStrategyRegistry.getAll()) {
      const lastFired = this.lastFiredByStrategy.get(`${strategy.id}:${symbol}`) || 0;
      const evalResult = strategy.evaluate(
        {
          symbol,
          timeframe: '15m',
          candles,
          currentPrice,
          session,
          asianRange,
          lastFiredTimestamp: lastFired,
        },
        strategy.defaultConfig
      );

      if (evalResult.signal) {
        const sig = evalResult.signal;
        this.activeSignals.set(sig.id, sig);
        this.lastFiredByStrategy.set(`${strategy.id}:${symbol}`, Date.now());

        // Save signal to database
        try {
          await prisma.signal.create({
            data: {
              id: sig.id,
              strategyId: sig.strategyId,
              strategyName: sig.strategyName,
              symbol: sig.symbol,
              timeframe: sig.timeframe,
              side: sig.side,
              price: sig.price,
              entry: sig.entry,
              stopLoss: sig.stopLoss,
              takeProfit: sig.takeProfit,
              riskReward: sig.riskReward,
              timestamp: BigInt(sig.timestamp),
              status: sig.status,
              reason: sig.reason,
              conditions: JSON.stringify(sig.conditions),
              metadata: sig.metadata ? JSON.stringify(sig.metadata) : null,
            },
          });
        } catch (e) {
          // ignore duplicate id
        }

        // Process through execution pipeline
        await this.executionPipeline.processSignal(sig);
      }
    }
  }

  public getActiveSignals(): Signal[] {
    return Array.from(this.activeSignals.values()).slice(-20);
  }
}

export const tradingService = new TradingService();
