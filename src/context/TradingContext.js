import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { loadTrading, saveTrading } from "../lib/storage";
import { INSTRUMENTS, pnlUsd, fromPips, formatPrice } from "../lib/instruments";
import {
  generateHistory,
  nextTick,
  upsertCandle,
  connectBinance,
} from "../lib/market";
import { evaluateLondonHarsi, evaluatePulseConfluence } from "../lib/algorithms";
import { getSessionState } from "../lib/sessions";
import { startingBalance } from "../lib/brokers";

const TradingContext = createContext(null);

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function beep(side) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = side === "buy" ? 740 : 320;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.stop(ctx.currentTime + 0.36);
  } catch (e) {
    /* audio optional */
  }
}

export function TradingProvider({ children }) {
  const { user, plan } = useAuth();
  const [symbol, setSymbol] = useState("EURUSD");
  const [candles, setCandles] = useState([]);
  const [asian, setAsian] = useState(null);
  const [lastPrice, setLastPrice] = useState(null);
  const [harsi, setHarsi] = useState(null);
  const [pulse, setPulse] = useState(null);
  const [session, setSession] = useState(getSessionState());
  const [brokers, setBrokers] = useState([]);
  const [activeBrokerId, setActiveBrokerId] = useState("paper");
  const [positions, setPositions] = useState([]);
  const [closed, setClosed] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [settings, setSettings] = useState({
    sound: true,
    desktop: true,
    autoExecute: false,
    forceLondonWindow: true,
    riskPercent: 1,
    defaultLots: 0.1,
  });
  const [hydrated, setHydrated] = useState(false);
  const firedRef = useRef({ buy: false, sell: false, pulse: 0 });
  const priceRef = useRef(null);
  const asianRef = useRef(null);
  const candlesRef = useRef([]);
  const settingsRef = useRef(settings);
  const positionsRef = useRef([]);
  const planRef = useRef(plan);
  const userRef = useRef(user);
  const brokersRef = useRef([]);
  const ingestRef = useRef(() => {});

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    brokersRef.current = brokers;
  }, [brokers]);

  useEffect(() => {
    if (!user) {
      setHydrated(false);
      return;
    }
    const saved = loadTrading(user.id);
    setBrokers(saved.brokers);
    setActiveBrokerId(saved.activeBrokerId || "paper");
    setPositions(saved.positions || []);
    setClosed(saved.closed || []);
    setAlerts(saved.alerts || []);
    setSettings({ ...settings, ...(saved.settings || {}) });
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user || !hydrated) return;
    saveTrading(user.id, {
      brokers,
      activeBrokerId,
      positions,
      closed,
      alerts: alerts.slice(0, 80),
      settings,
    });
  }, [user, hydrated, brokers, activeBrokerId, positions, closed, alerts, settings]);

  const pushAlert = useCallback((alert) => {
    const allowed = planRef.current?.alerts;
    const full = {
      id: uid("al"),
      ts: Date.now(),
      unread: true,
      ...alert,
    };
    if (allowed) {
      setAlerts((prev) => [full, ...prev].slice(0, 80));
      setToasts((prev) => [...prev, full].slice(-4));
      if (settingsRef.current.sound) beep(alert.side);
      if (settingsRef.current.desktop && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification(full.title, { body: full.message });
          } catch (e) {
            /* ignore */
          }
        }
      }
    } else {
      setAlerts((prev) =>
        [
          {
            ...full,
            locked: true,
            title: "Subscriber alert",
            message: "Upgrade to Operator to unlock live open/close alerts.",
          },
          ...prev,
        ].slice(0, 80)
      );
    }
    return full;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const closePosition = useCallback(
    (id, reason = "Manual close") => {
      const pos = positionsRef.current.find((p) => p.id === id);
      if (!pos) return;
      const px = priceRef.current?.[pos.symbol] ?? pos.entry;
      const pnl = pnlUsd(pos.symbol, pos.side, pos.entry, px, pos.lots);
      const closedPos = {
        ...pos,
        status: "closed",
        exit: px,
        pnl,
        closedAt: Date.now(),
        reason,
      };
      setPositions((prev) => prev.filter((p) => p.id !== id));
      setClosed((prev) => [closedPos, ...prev].slice(0, 60));
      setBrokers((prev) =>
        prev.map((b) =>
          b.id === pos.brokerId ? { ...b, balance: (b.balance || 0) + pnl } : b
        )
      );
      pushAlert({
        type: "close",
        side: pos.side,
        symbol: pos.symbol,
        title: `Close ${pos.side.toUpperCase()} ${pos.symbol}`,
        message: `${reason}. Fill ${formatPrice(pos.symbol, px)} · P&L ${
          pnl >= 0 ? "+" : ""
        }${pnl.toFixed(2)} USD`,
        algorithm: pos.algorithm,
        actionable: false,
      });
    },
    [pushAlert]
  );

  const openPosition = useCallback(
    ({
      side,
      lots,
      slPips,
      tpPips,
      algorithm,
      note,
      symbol: sym,
      brokerId,
    }) => {
      if (!planRef.current?.execute) {
        throw new Error("Subscribe to Operator to send orders to a broker.");
      }
      const useSymbol = sym || symbol;
      const px = priceRef.current?.[useSymbol];
      if (!px) throw new Error("No market price yet.");
      const list = brokersRef.current;
      const broker =
        list.find((b) => b.id === (brokerId || activeBrokerId)) ||
        list.find((b) => b.id === "paper");
      if (!broker || broker.status !== "connected") {
        throw new Error("Connect a broker first.");
      }
      const sl =
        slPips != null
          ? side === "buy"
            ? px - fromPips(useSymbol, slPips)
            : px + fromPips(useSymbol, slPips)
          : null;
      const tp =
        tpPips != null
          ? side === "buy"
            ? px + fromPips(useSymbol, tpPips)
            : px - fromPips(useSymbol, tpPips)
          : null;
      const pos = {
        id: uid("pos"),
        symbol: useSymbol,
        side,
        lots: Number(lots) || settingsRef.current.defaultLots,
        entry: px,
        sl,
        tp,
        slPips,
        tpPips,
        algorithm: algorithm || "manual",
        note: note || "",
        brokerId: broker.id,
        brokerName: broker.name,
        openedAt: Date.now(),
        status: "open",
      };
      setPositions((prev) => [pos, ...prev]);
      pushAlert({
        type: "open",
        side,
        symbol: useSymbol,
        title: `Open ${side.toUpperCase()} ${useSymbol}`,
        message: `Filled ${formatPrice(useSymbol, px)} · ${pos.lots} lots via ${
          broker.name
        }${algorithm ? ` · ${algorithm}` : ""}`,
        algorithm,
        positionId: pos.id,
        actionable: true,
      });
      return pos;
    },
    [activeBrokerId, pushAlert, symbol]
  );

  const maybeAuto = useCallback(
    (signal, harsiValue) => {
      const eliteAuto =
        planRef.current?.autoExecute && settingsRef.current.autoExecute;
      if (!eliteAuto || !planRef.current?.execute) return;
      try {
        openPosition({
          side: signal.side,
          lots: settingsRef.current.defaultLots,
          slPips: signal.slPips,
          tpPips: signal.tpPips,
          algorithm: signal.algorithm,
          note: `Auto ${signal.algorithm} · Harsi ${harsiValue?.toFixed?.(1) || ""}`,
        });
      } catch (e) {
        /* ignore auto failures */
      }
    },
    [openPosition]
  );

  const ingestPrice = useCallback(
    (sym, price, volume = 8) => {
      const ts = Math.floor(Date.now() / 1000);
      if (sym === symbol) {
        setLastPrice(price);
        setCandles((prev) => {
          const next = upsertCandle(prev, price, ts, volume);
          candlesRef.current = next;
          return next;
        });
      }
      priceRef.current = { ...(priceRef.current || {}), [sym]: price };

      const sess = getSessionState(
        new Date(),
        settingsRef.current.forceLondonWindow
      );
      setSession(sess);

      if (sym !== symbol) return;

      const { harsi: h, signal: harsiSignal } = evaluateLondonHarsi({
        symbol: sym,
        price,
        asian: asianRef.current,
        inWindow: sess.inHarsiWindow,
        fired: firedRef.current,
      });
      setHarsi(h);

      if (harsiSignal) {
        firedRef.current[harsiSignal.side] = true;
        const alert = pushAlert({
          type: "harsi",
          side: harsiSignal.side,
          symbol: sym,
          title: `Harsi ${harsiSignal.side.toUpperCase()} · ${sym}`,
          message: `${harsiSignal.reason} Harsi ${h.value.toFixed(1)} pips from Asian mid.`,
          algorithm: "london-harsi",
          harsi: h.value,
          slPips: harsiSignal.slPips,
          tpPips: harsiSignal.tpPips,
          actionable: true,
        });
        maybeAuto(harsiSignal, h.value);
        void alert;
      }

      const candlesNow = candlesRef.current;
      if (candlesNow.length > 40) {
        const pulseNow = evaluatePulseConfluence({
          candles: candlesNow,
          symbol: sym,
        });
        setPulse(pulseNow);
        if (
          pulseNow.signal &&
          Date.now() - firedRef.current.pulse > 8 * 60 * 1000
        ) {
          firedRef.current.pulse = Date.now();
          pushAlert({
            type: "pulse",
            side: pulseNow.signal.side,
            symbol: sym,
            title: `Pulse ${pulseNow.signal.side.toUpperCase()} · ${sym}`,
            message: `${pulseNow.signal.reason} Score ${pulseNow.score}.`,
            algorithm: "pulse-confluence",
            score: pulseNow.score,
            slPips: pulseNow.signal.slPips,
            tpPips: pulseNow.signal.tpPips,
            actionable: true,
          });
          maybeAuto(pulseNow.signal, h?.value);
        }
      }

      positionsRef.current.forEach((pos) => {
        if (pos.symbol !== sym) return;
        const px = price;
        if (pos.sl != null) {
          if (pos.side === "buy" && px <= pos.sl) {
            closePosition(pos.id, "Stop loss");
          } else if (pos.side === "sell" && px >= pos.sl) {
            closePosition(pos.id, "Stop loss");
          }
        }
        if (pos.tp != null) {
          if (pos.side === "buy" && px >= pos.tp) {
            closePosition(pos.id, "Take profit");
          } else if (pos.side === "sell" && px <= pos.tp) {
            closePosition(pos.id, "Take profit");
          }
        }
      });
    },
    [symbol, pushAlert, maybeAuto, closePosition]
  );

  useEffect(() => {
    ingestRef.current = ingestPrice;
  }, [ingestPrice]);

  useEffect(() => {
    const hist = generateHistory(symbol);
    setCandles(hist.candles);
    candlesRef.current = hist.candles;
    setAsian(hist.asian);
    asianRef.current = hist.asian;
    setLastPrice(hist.lastPrice);
    priceRef.current = { ...(priceRef.current || {}), [symbol]: hist.lastPrice };
    firedRef.current = { buy: false, sell: false, pulse: 0 };
    const inst = INSTRUMENTS[symbol];
    let stopLive = () => {};
    let timer;
    if (inst.live) {
      stopLive = connectBinance(symbol, ({ price, volume }) => {
        ingestRef.current(symbol, price, Math.max(1, volume));
      });
    } else {
      timer = setInterval(() => {
        const last = priceRef.current?.[symbol];
        if (last == null) return;
        const tick = nextTick(
          symbol,
          last,
          asianRef.current,
          settingsRef.current.forceLondonWindow
        );
        ingestRef.current(symbol, tick.price, 10 + Math.round(Math.random() * 20));
      }, 900);
    }
    return () => {
      stopLive();
      if (timer) clearInterval(timer);
    };
  }, [symbol]);

  const connectBroker = useCallback((payload) => {
    const broker = {
      id: uid("br"),
      type: payload.type,
      name: payload.name,
      status: "connected",
      accountId:
        payload.accountId ||
        payload.login ||
        payload.keyId ||
        payload.username ||
        `${payload.type.toUpperCase()}-LIVE`,
      balance: startingBalance(payload.type),
      currency: "USD",
      leverage: payload.type === "binance" ? 1 : 30,
      connectedAt: Date.now(),
      meta: payload,
    };
    setBrokers((prev) => [...prev, broker]);
    setActiveBrokerId(broker.id);
    return broker;
  }, []);

  const disconnectBroker = useCallback((id) => {
    if (id === "paper") return;
    setBrokers((prev) => prev.filter((b) => b.id !== id));
    setActiveBrokerId("paper");
  }, []);

  const executeFromAlert = useCallback(
    (alert) => {
      if (!alert?.side) return;
      return openPosition({
        side: alert.side,
        lots: settings.defaultLots,
        slPips: alert.slPips,
        tpPips: alert.tpPips,
        algorithm: alert.algorithm,
        symbol: alert.symbol,
        note: alert.title,
      });
    },
    [openPosition, settings.defaultLots]
  );

  const marked = useMemo(
    () =>
      positions.map((p) => {
        const px = priceRef.current?.[p.symbol] ?? lastPrice ?? p.entry;
        const pnl = pnlUsd(p.symbol, p.side, p.entry, px, p.lots);
        return { ...p, mark: px, pnl };
      }),
    [positions, lastPrice]
  );

  const value = useMemo(
    () => ({
      symbol,
      setSymbol,
      candles,
      asian,
      lastPrice,
      harsi,
      pulse,
      session,
      brokers,
      activeBrokerId,
      setActiveBrokerId,
      positions: marked,
      closed,
      alerts,
      toasts,
      settings,
      setSettings,
      openPosition,
      closePosition,
      connectBroker,
      disconnectBroker,
      executeFromAlert,
      dismissToast,
      requestNotifications: () => {
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
      },
      prices: priceRef.current || {},
    }),
    [
      symbol,
      candles,
      asian,
      lastPrice,
      harsi,
      pulse,
      session,
      brokers,
      activeBrokerId,
      marked,
      closed,
      alerts,
      toasts,
      settings,
      openPosition,
      closePosition,
      connectBroker,
      disconnectBroker,
      executeFromAlert,
      dismissToast,
    ]
  );

  return (
    <TradingContext.Provider value={value}>{children}</TradingContext.Provider>
  );
}

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used inside TradingProvider");
  return ctx;
}
