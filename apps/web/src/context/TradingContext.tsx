import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Candle,
  Tick,
  Signal,
  Order,
  Position,
  AccountOverview,
  BrokerConnectionInfo,
  OrderRequest,
  MarketSession,
  getInstrument,
} from '@harsi/shared';
import { useAuth } from './AuthContext';

interface TradingContextType {
  symbol: string;
  setSymbol: (s: string) => void;
  timeframe: string;
  setTimeframe: (tf: string) => void;
  candles: Candle[];
  lastTick: Tick | null;
  sessionState: any;
  account: AccountOverview;
  positions: Position[];
  orders: Order[];
  signals: Signal[];
  selectedSignal: Signal | null;
  setSelectedSignal: (sig: Signal | null) => void;
  brokers: BrokerConnectionInfo[];
  activeBroker: BrokerConnectionInfo | null;
  wsConnected: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  forceLondonWindow: boolean;
  toggleLondonWindow: () => Promise<void>;
  placeOrder: (req: Partial<OrderRequest>) => Promise<Order>;
  closePosition: (id: string) => Promise<void>;
  partialClosePosition: (id: string, lots: number) => Promise<void>;
  modifyPosition: (id: string, sl?: number, tp?: number) => Promise<void>;
  selectBroker: (brokerId: string) => Promise<void>;
  triggerEmergencyStop: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const TradingContext = createContext<TradingContextType | null>(null);

function playBeep(side: 'BUY' | 'SELL') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = side === 'BUY' ? 740 : 380;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.stop(ctx.currentTime + 0.36);
  } catch (e) {
    // audio optional
  }
}

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [symbol, setSymbol] = useState<string>('EURUSD');
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [lastTick, setLastTick] = useState<Tick | null>(null);
  const [sessionState, setSessionState] = useState<any>(null);
  const [forceLondonWindow, setForceLondonWindow] = useState<boolean>(true);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [brokers, setBrokers] = useState<BrokerConnectionInfo[]>([]);
  const [activeBroker, setActiveBroker] = useState<BrokerConnectionInfo | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [account, setAccount] = useState<AccountOverview>({
    balance: 100000,
    equity: 100000,
    cash: 100000,
    marginUsed: 0,
    buyingPower: 1000000,
    unrealizedPnl: 0,
    realizedPnl: 0,
    todayPnl: 0,
    totalReturnPct: 0,
    openRiskPct: 0,
    maxDrawdownPct: 0,
    currency: 'USD',
    mode: 'PAPER',
  });

  const wsRef = useRef<WebSocket | null>(null);
  const symbolRef = useRef(symbol);
  useEffect(() => {
    symbolRef.current = symbol;
  }, [symbol]);

  // Fetch initial candles whenever symbol changes
  const fetchCandles = useCallback(async (sym: string) => {
    try {
      const res = await fetch(`/api/market/candles/${sym}`);
      if (res.ok) {
        const data = await res.json();
        setCandles(data.candles || []);
      }
    } catch (err) {
      console.error('Failed to fetch candles:', err);
    }
  }, []);

  useEffect(() => {
    fetchCandles(symbol);
  }, [symbol, fetchCandles]);

  // Fetch initial account, positions, orders, brokers, session
  const refreshAll = useCallback(async () => {
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [sessRes, sigRes, posRes, ordRes, brkRes] = await Promise.all([
        fetch('/api/market/sessions'),
        fetch('/api/signals/active'),
        fetch('/api/positions', { headers }),
        fetch('/api/orders', { headers }),
        fetch('/api/brokers', { headers }),
      ]);

      if (sessRes.ok) {
        const data = await sessRes.json();
        setSessionState(data.session);
        setForceLondonWindow(data.forceLondonWindow);
      }
      if (sigRes.ok) {
        const data = await sigRes.json();
        setSignals(data.signals || []);
      }
      if (posRes.ok) {
        const data = await posRes.json();
        setPositions(data.positions || []);
      }
      if (ordRes.ok) {
        const data = await ordRes.json();
        setOrders(data.orders || []);
      }
      if (brkRes.ok) {
        const data = await brkRes.json();
        setBrokers(data.brokers || []);
        if (data.activeAccount) {
          setAccount({
            balance: data.activeAccount.balance,
            equity: data.activeAccount.equity,
            cash: data.activeAccount.cash,
            marginUsed: data.activeAccount.marginUsed,
            buyingPower: data.activeAccount.buyingPower,
            unrealizedPnl: data.activeAccount.unrealizedPnl,
            realizedPnl: data.activeAccount.realizedPnl,
            todayPnl: 110.0,
            totalReturnPct: 2.92,
            openRiskPct: 0.85,
            maxDrawdownPct: 1.42,
            currency: data.activeAccount.currency,
            mode: data.activeAccount.mode,
          });
        }
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  }, [token]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // WebSocket Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'TICK') {
          const { symbol: tickSym, tick, candle } = msg.payload;
          if (tickSym === symbolRef.current) {
            setLastTick(tick);
            setCandles((prev) => {
              if (!prev.length) return [candle];
              const last = prev[prev.length - 1];
              if (last.time === candle.time) {
                return [...prev.slice(0, -1), candle];
              } else {
                return [...prev, candle].slice(-300);
              }
            });
          }
        } else if (msg.type === 'SIGNAL') {
          const newSignal: Signal = msg.payload;
          setSignals((prev) => [newSignal, ...prev.filter((s) => s.id !== newSignal.id)].slice(0, 30));
          if (soundEnabled) {
            playBeep(newSignal.side);
          }
        } else if (msg.type === 'SESSION_UPDATE') {
          setSessionState(msg.payload);
        } else if (msg.type === 'ORDER_UPDATE' || msg.type === 'POSITION_CLOSED') {
          refreshAll();
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [soundEnabled, refreshAll]);

  const toggleLondonWindow = async () => {
    const res = await fetch('/api/market/toggle-london-window', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setForceLondonWindow(data.forceLondonWindow);
      setSessionState(data.session);
    }
  };

  const placeOrder = async (req: Partial<OrderRequest>): Promise<Order> => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        symbol,
        side: req.side || 'BUY',
        type: req.type || 'MARKET',
        lots: req.lots || 0.1,
        price: lastTick?.price || req.price,
        stopLoss: req.stopLoss,
        takeProfit: req.takeProfit,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit order');
    }
    await refreshAll();
    return data.order;
  };

  const closePosition = async (id: string) => {
    const res = await fetch(`/api/positions/close/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to close position');
    await refreshAll();
  };

  const partialClosePosition = async (id: string, lots: number) => {
    const res = await fetch(`/api/positions/partial-close/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ lots }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to partial close position');
    await refreshAll();
  };

  const modifyPosition = async (id: string, sl?: number, tp?: number) => {
    const res = await fetch(`/api/positions/modify/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stopLoss: sl, takeProfit: tp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to modify position');
    await refreshAll();
  };

  const selectBroker = async (brokerId: string) => {
    const res = await fetch('/api/brokers/select', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ brokerId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to switch broker');
    await refreshAll();
  };

  const triggerEmergencyStop = async () => {
    const res = await fetch('/api/automation/emergency-stop', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Emergency stop failed');
    await refreshAll();
  };

  return (
    <TradingContext.Provider
      value={{
        symbol,
        setSymbol,
        timeframe,
        setTimeframe,
        candles,
        lastTick,
        sessionState,
        account,
        positions,
        orders,
        signals,
        selectedSignal,
        setSelectedSignal,
        brokers,
        activeBroker,
        wsConnected,
        soundEnabled,
        setSoundEnabled,
        forceLondonWindow,
        toggleLondonWindow,
        placeOrder,
        closePosition,
        partialClosePosition,
        modifyPosition,
        selectBroker,
        triggerEmergencyStop,
        refreshAll,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) throw new Error('useTrading must be used within TradingProvider');
  return context;
};
