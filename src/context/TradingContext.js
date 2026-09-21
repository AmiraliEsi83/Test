import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { loadTrading, saveTrading, planAllows } from "../lib/storage";
import { INSTRUMENTS, pnlUsd, fromPips, formatPrice } from "../lib/instruments";
import { generateHistory, nextTick, upsertCandle, connectBinance, resample, marketSourceLabel } from "../lib/market";
import { evaluateLondonHarsi, evaluatePulseConfluence } from "../lib/algorithms";
import { evaluateBreakout, STRATEGY_DEFAULTS } from "../lib/strategies";
import { getSessionState } from "../lib/sessions";
import { evaluateRisk, DEFAULT_RISK } from "../lib/risk";
import { startingBalance } from "../lib/brokers";
import { logAudit } from "../lib/audit";

const TradingContext = createContext(null);

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
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
  } catch (e) { /* audio optional */ }
}

const TIMEFRAMES = ["1m", "5m", "15m", "1h"];

export function TradingProvider({ children }) {
  const { user, plan } = useAuth();
  const [symbol, setSymbol] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("1m");
  const [candles1m, setCandles1m] = useState([]);
  const [asian, setAsian] = useState(null);
  const [lastPrice, setLastPrice] = useState(null);
  const [harsi, setHarsi] = useState(null);
  const [pulse, setPulse] = useState(null);
  const [breakout, setBreakout] = useState(null);
  const [session, setSession] = useState(getSessionState());
  const [brokers, setBrokers] = useState([]);
  const [activeBrokerId, setActiveBrokerId] = useState("paper");
  const [mode, setMode] = useState("paper");
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [closed, setClosed] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [signals, setSignals] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [audit, setAudit] = useState([]);
  const [watchlist, setWatchlist] = useState(["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSDT", "ETHUSDT", "SPY", "QQQ"]);
  const [strategies, setStrategies] = useState(JSON.parse(JSON.stringify(STRATEGY_DEFAULTS)));
  const [automation, setAutomation] = useState({ "london-harsi": { alerts: true, paperAuto: true, liveAuto: false }, "pulse-confluence": { alerts: true, paperAuto: false, liveAuto: false }, "breakout-trend": { alerts: true, paperAuto: false, liveAuto: false }, stopped: false });
  const [risk, setRisk] = useState({ ...DEFAULT_RISK });
  const [backtests, setBacktests] = useState([]);
  const [settings, setSettings] = useState({ sound: true, desktop: false, autoExecute: false, forceLondonWindow: true, riskPercent: 1, defaultLots: 0.1 });
  const [hydrated, setHydrated] = useState(false);
  const [wsState, setWsState] = useState("demo");

  const firedRef = useRef({ buy: false, sell: false, pulse: 0, breakout: 0, counts: {} });
  const priceRef = useRef(null);
  const asianRef = useRef(null);
  const candlesRef = useRef([]);
  const settingsRef = useRef(settings);
  const positionsRef = useRef([]);
  const planRef = useRef(plan);
  const userRef = useRef(user);
  const brokersRef = useRef([]);
  const strategiesRef = useRef(strategies);
  const automationRef = useRef(automation);
  const riskRef = useRef(risk);
  const ordersRef = useRef([]);
  const closedRef = useRef([]);
  const ingestRef = useRef(() => {});
  const symbolRef = useRef(symbol);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { planRef.current = plan; }, [plan]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { brokersRef.current = brokers; }, [brokers]);
  useEffect(() => { strategiesRef.current = strategies; }, [strategies]);
  useEffect(() => { automationRef.current = automation; }, [automation]);
  useEffect(() => { riskRef.current = risk; }, [risk]);
  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { closedRef.current = closed; }, [closed]);
  useEffect(() => { symbolRef.current = symbol; }, [symbol]);

  const addAudit = useCallback((kind, message) => {
    setAudit((p) => logAudit(p, { kind, message }));
  }, []);

  useEffect(() => {
    if (!user) { setHydrated(false); return; }
    const saved = loadTrading(user.id);
    setBrokers(saved.brokers);
    setActiveBrokerId(saved.activeBrokerId || "paper");
    setMode(saved.mode || "paper");
    setPositions(saved.positions || []);
    setOrders(saved.orders || []);
    setClosed(saved.closed || []);
    setAlerts(saved.alerts || []);
    setSignals(saved.signals || []);
    setBacktests(saved.backtests || []);
    setAudit(saved.audit || []);
    setWatchlist(saved.watchlist || ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSDT", "ETHUSDT", "SPY", "QQQ"]);
    setStrategies({ ...JSON.parse(JSON.stringify(STRATEGY_DEFAULTS)), ...(saved.strategies || {}) });
    setAutomation(saved.automation || automation);
    setRisk({ ...DEFAULT_RISK, ...(saved.risk || {}) });
    setSettings({ ...settings, ...(saved.settings || {}) });
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user || !hydrated) return;
    saveTrading(user.id, { brokers, activeBrokerId, mode, positions, orders, closed, alerts: alerts.slice(0, 80), signals: signals.slice(0, 120), backtests: backtests.slice(0, 20), audit: audit.slice(0, 200), watchlist, strategies, automation, risk, settings });
  }, [user, hydrated, brokers, activeBrokerId, mode, positions, orders, closed, alerts, signals, backtests, audit, watchlist, strategies, automation, risk, settings]);

  const pushAlert = useCallback((alert) => {
    const full = { id: uid("al"), ts: Date.now(), unread: true, ...alert };
    const auto = automationRef.current?.[alert.algorithm];
    const alertsOn = auto ? auto.alerts !== false : true;
    if (automationRef.current?.stopped) return full;
    if (!alertsOn) return full;
    if (planRef.current?.alerts) {
      setAlerts((prev) => [full, ...prev].slice(0, 80));
      const n = settingsRef.current.notifications || {};
      const typeOk = alert.type === "harsi" || alert.type === "pulse" || alert.type === "breakout" ? n.signal !== false : true;
      if (typeOk) {
        setToasts((prev) => [...prev, full].slice(-4));
        if (settingsRef.current.sound) beep(alert.side);
        if (settingsRef.current.desktop && "Notification" in window && Notification.permission === "granted") {
          try { new Notification(full.title, { body: full.message }); } catch (e) { /* ignore */ }
        }
      }
    } else {
      setAlerts((prev) => [{ ...full, locked: true, title: "Subscriber alert", message: "Upgrade to Trader to unlock live open/close alerts." }, ...prev].slice(0, 80));
    }
    return full;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const recordSignal = useCallback((sig) => {
    const full = { id: uid("sig"), ts: Date.now(), status: "open", timeframe: "1m", price: sig.price, entry: sig.price, simulated: true, ...sig };
    if (full.slPips != null && full.entry != null) {
      full.stop = full.side === "buy" ? full.entry - fromPips(full.symbol, full.slPips) : full.entry + fromPips(full.symbol, full.slPips);
      full.target = full.side === "buy" ? full.entry + fromPips(full.symbol, full.tpPips) : full.entry - fromPips(full.symbol, full.tpPips);
    }
    setSignals((prev) => [full, ...prev].slice(0, 120));
    return full;
  }, []);

  const closePosition = useCallback((id, reason = "Manual close", partialLots) => {
    const pos = positionsRef.current.find((p) => p.id === id);
    if (!pos) return null;
    const px = priceRef.current?.[pos.symbol] ?? pos.entry;
    if (partialLots && partialLots < pos.lots) {
      const pnl = pnlUsd(pos.symbol, pos.side, pos.entry, px, partialLots);
      const closedPart = { ...pos, lots: partialLots, status: "closed", exit: px, pnl, closedAt: Date.now(), reason: `${reason} (partial)`, mode: pos.mode || "paper" };
      setClosed((prev) => [closedPart, ...prev].slice(0, 120));
      setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, lots: Math.round((p.lots - partialLots) * 100) / 100 } : p)));
      setBrokers((prev) => prev.map((b) => (b.id === pos.brokerId ? { ...b, balance: (b.balance || 0) + pnl, lastSync: Date.now() } : b)));
      pushAlert({ type: "close", side: pos.side, symbol: pos.symbol, title: `Partial close ${pos.symbol}`, message: `${reason}. ${partialLots} lots @ ${formatPrice(pos.symbol, px)} · ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USD`, algorithm: pos.algorithm, actionable: false });
      setAudit((p) => logAudit(p, { kind: "position_closed", message: `Partial close ${pos.symbol} ${partialLots} lots (${reason})` }));
      return closedPart;
    }
    const pnl = pnlUsd(pos.symbol, pos.side, pos.entry, px, pos.lots);
    const closedPos = { ...pos, status: "closed", exit: px, pnl, closedAt: Date.now(), reason, mode: pos.mode || "paper" };
    setPositions((prev) => prev.filter((p) => p.id !== id));
    setClosed((prev) => [closedPos, ...prev].slice(0, 120));
    setBrokers((prev) => prev.map((b) => (b.id === pos.brokerId ? { ...b, balance: (b.balance || 0) + pnl, lastSync: Date.now() } : b)));
    setSignals((prev) => prev.map((s) => (s.positionId === id ? { ...s, status: "closed", result: pnl >= 0 ? "win" : "loss" } : s)));
    pushAlert({ type: "close", side: pos.side, symbol: pos.symbol, title: `Close ${pos.side.toUpperCase()} ${pos.symbol}`, message: `${reason}. Fill ${formatPrice(pos.symbol, px)} · P&L ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USD`, algorithm: pos.algorithm, actionable: false });
    setAudit((p) => logAudit(p, { kind: "position_closed", message: `Close ${pos.side} ${pos.symbol} ${pos.lots} lots @ ${formatPrice(pos.symbol, px)} (${reason})` }));
    return closedPos;
  }, [pushAlert]);

  const openPosition = useCallback(({ side, lots, slPips, tpPips, algorithm, note, symbol: sym, brokerId, signalId }) => {
    const useSymbol = sym || symbolRef.current;
    const auto = automationRef.current;
    if (auto?.stopped) throw new Error("Automation is stopped (kill switch).");
    const px = priceRef.current?.[useSymbol];
    if (px == null) throw new Error("No market price yet.");
    const list = brokersRef.current;
    const broker = list.find((b) => b.id === (brokerId || activeBrokerId)) || list.find((b) => b.id === "paper");
    if (!broker || broker.status !== "connected") throw new Error("Connect a broker first.");
    const isPaper = broker.id === "paper" || broker.type === "paper";
    if (!isPaper && mode !== "live") throw new Error("Switch to LIVE mode to route to a live broker.");
    if (!planAllows(planRef.current, "paperExecute") && isPaper) throw new Error("Paper trading unavailable on this plan.");
    const effLots = Number(lots) || settingsRef.current.defaultLots;
    const check = evaluateRisk({ order: { symbol: useSymbol, lots: effLots }, account: { balance: broker.balance }, positions: positionsRef.current, closed: closedRef.current, risk: riskRef.current });
    if (!check.allowed) {
      setAudit((p) => logAudit(p, { kind: "risk_blocked", message: `Risk blocked ${side} ${useSymbol}: ${check.reasons[0]}` }));
      throw new Error(`Risk manager blocked order: ${check.reasons[0]}`);
    }
    const sl = slPips != null ? (side === "buy" ? px - fromPips(useSymbol, slPips) : px + fromPips(useSymbol, slPips)) : null;
    const tp = tpPips != null ? (side === "buy" ? px + fromPips(useSymbol, tpPips) : px - fromPips(useSymbol, tpPips)) : null;
    const pos = {
      id: uid("pos"), symbol: useSymbol, side, lots: effLots, entry: px, sl, tp, slPips, tpPips,
      algorithm: algorithm || "manual", note: note || "", brokerId: broker.id, brokerName: broker.name,
      openedAt: Date.now(), status: "open", mode: isPaper ? "paper" : "live", simulated: isPaper,
    };
    setPositions((prev) => [pos, ...prev]);
    const order = { id: uid("ord"), symbol: useSymbol, side, type: "market", lots: effLots, price: px, status: "filled", algorithm: pos.algorithm, brokerId: broker.id, createdAt: Date.now(), mode: pos.mode };
    setOrders((prev) => [order, ...prev].slice(0, 120));
    pushAlert({ type: "open", side, symbol: useSymbol, title: `Open ${side.toUpperCase()} ${useSymbol}`, message: `Filled ${formatPrice(useSymbol, px)} · ${pos.lots} lots via ${broker.name}${algorithm ? ` · ${algorithm}` : ""} [${pos.mode.toUpperCase()}]`, algorithm, positionId: pos.id, actionable: true });
    setAudit((p) => logAudit(p, { kind: "order_submitted", message: `Market ${side} ${useSymbol} ${effLots} lots via ${broker.name} [${pos.mode}]` }));
    if (signalId) setSignals((prev) => prev.map((s) => (s.id === signalId ? { ...s, positionId: pos.id } : s)));
    return pos;
  }, [activeBrokerId, mode, pushAlert]);

  const placePendingOrder = useCallback(({ side, type, lots, price, symbol: sym, algorithm }) => {
    const useSymbol = sym || symbolRef.current;
    if (!price || price <= 0) throw new Error("Limit/stop price required.");
    const order = { id: uid("ord"), symbol: useSymbol, side, type, lots: Number(lots) || settingsRef.current.defaultLots, price, status: "pending", algorithm: algorithm || "manual", brokerId: activeBrokerId, createdAt: Date.now(), mode };
    setOrders((prev) => [order, ...prev].slice(0, 120));
    setAudit((p) => logAudit(p, { kind: "order_submitted", message: `${type} ${side} ${useSymbol} ${order.lots} @ ${formatPrice(useSymbol, price)}` }));
    return order;
  }, [activeBrokerId, mode]);

  const cancelOrder = useCallback((id) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o)));
    setAudit((p) => logAudit(p, { kind: "order_cancelled", message: `Order ${id} cancelled` }));
  }, []);

  const maybeAuto = useCallback((signal) => {
    if (automationRef.current?.stopped) return;
    const cfg = automationRef.current?.[signal.algorithm];
    if (!cfg) return;
    const broker = brokersRef.current.find((b) => b.id === activeBrokerId);
    const isPaper = !broker || broker.id === "paper" || broker.type === "paper";
    const wantAuto = isPaper ? cfg.paperAuto : cfg.liveAuto;
    if (!wantAuto) return;
    if (isPaper && !planRef.current?.paperAuto) return;
    if (!isPaper && !planRef.current?.autoExecute) return;
    if (!planAllows(planRef.current, "strategy", signal.algorithm)) return;
    try {
      openPosition({ side: signal.side, lots: settingsRef.current.defaultLots, slPips: signal.slPips, tpPips: signal.tpPips, algorithm: signal.algorithm, note: `Auto ${signal.algorithm}`, symbol: signal.symbol });
    } catch (e) { /* risk/stopped */ }
  }, [openPosition, activeBrokerId]);

  const ingestPrice = useCallback((sym, price, volume = 8) => {
    const ts = Math.floor(Date.now() / 1000);
    if (sym === symbolRef.current) {
      setLastPrice(price);
      setCandles1m((prev) => {
        const next = upsertCandle(prev, price, ts, volume);
        candlesRef.current = next;
        return next;
      });
    }
    priceRef.current = { ...(priceRef.current || {}), [sym]: price };
    const sess = getSessionState(new Date(), settingsRef.current.forceLondonWindow);
    setSession(sess);
    if (sym !== symbolRef.current) return;

    const strat = strategiesRef.current || {};
    const hCfg = strat["london-harsi"];
    if (hCfg?.enabled && (hCfg.symbols || []).includes(sym)) {
      const { harsi: h, signal: harsiSignal } = evaluateLondonHarsi({ symbol: sym, price, asian: asianRef.current, inWindow: sess.inHarsiWindow, fired: firedRef.current, config: hCfg });
      setHarsi(h);
      if (harsiSignal) {
        firedRef.current[harsiSignal.side] = true;
        const rec = recordSignal({ symbol: sym, timeframe: hCfg.timeframe || "1m", algorithm: "london-harsi", side: harsiSignal.side, price, reason: harsiSignal.reason, slPips: harsiSignal.slPips, tpPips: harsiSignal.tpPips, checks: [{ label: `HARSI in [${hCfg.buyMin},${hCfg.buyMax}] / [+${hCfg.sellMin},+${hCfg.sellMax}]`, pass: true, value: h.value.toFixed(1) }, { label: "T-15 window", pass: true, value: sess.name }, { label: "First print today", pass: true, value: "yes" }] });
        pushAlert({ type: "harsi", side: harsiSignal.side, symbol: sym, title: `Harsi ${harsiSignal.side.toUpperCase()} · ${sym}`, message: `${harsiSignal.reason} Harsi ${h.value.toFixed(1)} pips from Asian mid.`, algorithm: "london-harsi", harsi: h.value, slPips: harsiSignal.slPips, tpPips: harsiSignal.tpPips, actionable: true, signalId: rec.id });
        maybeAuto({ ...harsiSignal, symbol: sym });
      }
    }

    const candlesNow = candlesRef.current;
    if (candlesNow.length > 40) {
      const pCfg = strat["pulse-confluence"];
      if (pCfg?.enabled && (pCfg.symbols || []).includes(sym)) {
        const pulseNow = evaluatePulseConfluence({ candles: candlesNow, symbol: sym, config: pCfg });
        setPulse(pulseNow);
        if (pulseNow.signal && Date.now() - firedRef.current.pulse > (pCfg.cooldownMin || 8) * 60000) {
          firedRef.current.pulse = Date.now();
          const s = pulseNow.signal;
          const rec = recordSignal({ symbol: sym, timeframe: pCfg.timeframe || "5m", algorithm: "pulse-confluence", side: s.side, price, reason: s.reason, slPips: s.slPips, tpPips: s.tpPips, checks: pulseNow.checks, score: pulseNow.score });
          pushAlert({ type: "pulse", side: s.side, symbol: sym, title: `Pulse ${s.side.toUpperCase()} · ${sym}`, message: `${s.reason} Score ${pulseNow.score}.`, algorithm: "pulse-confluence", score: pulseNow.score, slPips: s.slPips, tpPips: s.tpPips, actionable: true, signalId: rec.id });
          maybeAuto({ ...s, symbol: sym });
        }
      }
      const bCfg = strat["breakout-trend"];
      if (bCfg?.enabled && (bCfg.symbols || []).includes(sym)) {
        const bNow = evaluateBreakout({ candles: candlesNow, symbol: sym, config: bCfg });
        setBreakout(bNow);
        if (bNow.signal && Date.now() - firedRef.current.breakout > (bCfg.cooldownMin || 30) * 60000) {
          firedRef.current.breakout = Date.now();
          const s = bNow.signal;
          const rec = recordSignal({ symbol: sym, timeframe: bCfg.timeframe || "15m", algorithm: "breakout-trend", side: s.side, price, reason: s.reason, slPips: s.slPips, tpPips: s.tpPips, checks: bNow.checks });
          pushAlert({ type: "breakout", side: s.side, symbol: sym, title: `Breakout ${s.side.toUpperCase()} · ${sym}`, message: s.reason, algorithm: "breakout-trend", slPips: s.slPips, tpPips: s.tpPips, actionable: true, signalId: rec.id });
          maybeAuto({ ...s, symbol: sym });
        }
      }
    }

    positionsRef.current.forEach((pos) => {
      if (pos.symbol !== sym) return;
      const px = price;
      if (pos.sl != null) {
        if ((pos.side === "buy" && px <= pos.sl) || (pos.side === "sell" && px >= pos.sl)) closePosition(pos.id, "Stop loss");
      } else if (pos.tp != null) {
        if ((pos.side === "buy" && px >= pos.tp) || (pos.side === "sell" && px <= pos.tp)) closePosition(pos.id, "Take profit");
      }
    });
    ordersRef.current.filter((o) => o.status === "pending" && o.symbol === sym).forEach((o) => {
      const hit = o.type === "limit"
        ? (o.side === "buy" ? price <= o.price : price >= o.price)
        : (o.side === "buy" ? price >= o.price : price <= o.price);
      if (hit) {
        setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: "filled", fillPrice: price } : x)));
        try {
          openPosition({ side: o.side, lots: o.lots, algorithm: o.algorithm, symbol: o.symbol, note: `${o.type} fill` });
        } catch (e) { /* risk */ }
      }
    });
  }, [closePosition, openPosition, pushAlert, recordSignal, maybeAuto]);

  useEffect(() => { ingestRef.current = ingestPrice; }, [ingestPrice]);

  useEffect(() => {
    const hist = generateHistory(symbol);
    setCandles1m(hist.candles);
    candlesRef.current = hist.candles;
    setAsian(hist.asian);
    asianRef.current = hist.asian;
    setLastPrice(hist.lastPrice);
    priceRef.current = { ...(priceRef.current || {}), [symbol]: hist.lastPrice };
    firedRef.current = { buy: false, sell: false, pulse: 0, breakout: 0, counts: {} };
    const inst = INSTRUMENTS[symbol];
    let stopLive = () => {};
    let timer;
    if (inst.live) {
      setWsState("live");
      stopLive = connectBinance(symbol, ({ price, volume }) => { ingestRef.current(symbol, price, Math.max(1, volume)); });
      timer = setInterval(() => {
        const last = priceRef.current?.[symbol];
        if (last == null) return;
        setCandles1m((prev) => { const n = [...prev]; candlesRef.current = n; return n; });
      }, 5000);
    } else {
      setWsState("demo");
      timer = setInterval(() => {
        const last = priceRef.current?.[symbol];
        if (last == null) return;
        const tick = nextTick(symbol, last, asianRef.current, settingsRef.current.forceLondonWindow);
        ingestRef.current(symbol, tick.price, 10 + Math.round(Math.random() * 20));
      }, 900);
    }
    return () => { stopLive(); if (timer) clearInterval(timer); };
  }, [symbol]);

  const connectBroker = useCallback((payload) => {
    if ((brokersRef.current.filter((b) => b.id !== "paper").length) >= (planRef.current?.brokers || 0) && payload.type !== "paper") {
      throw new Error("Broker seats exhausted on this plan. Upgrade to add more brokers.");
    }
    const broker = {
      id: uid("br"), type: payload.type, name: payload.name, status: "connected", environment: (payload.env || "paper").toUpperCase(),
      accountId: payload.accountId || payload.login || payload.keyId || payload.username || `${payload.type.toUpperCase()}-PAPER`,
      balance: startingBalance(payload.type), currency: "USD", leverage: payload.type === "binance" ? 1 : 30,
      connectedAt: Date.now(), lastSync: Date.now(), meta: { ...payload, apiKey: payload.apiKey ? "***" : undefined, secret: undefined, password: undefined },
    };
    setBrokers((prev) => [...prev, broker]);
    setActiveBrokerId(broker.id);
    setAudit((p) => logAudit(p, { kind: "broker_connected", message: `Connected ${broker.name} (${broker.environment}) — credentials kept client-side in demo; use server vault in production` }));
    return broker;
  }, []);

  const disconnectBroker = useCallback((id) => {
    if (id === "paper") return;
    const b = brokersRef.current.find((x) => x.id === id);
    setBrokers((prev) => prev.filter((x) => x.id !== id));
    setActiveBrokerId("paper");
    setAudit((p) => logAudit(p, { kind: "broker_disconnected", message: `Disconnected ${b?.name || id}` }));
  }, []);

  const executeFromAlert = useCallback((alert) => {
    if (!alert?.side) return null;
    return openPosition({ side: alert.side, lots: settings.defaultLots, slPips: alert.slPips, tpPips: alert.tpPips, algorithm: alert.algorithm, symbol: alert.symbol, note: alert.title, signalId: alert.signalId });
  }, [openPosition, settings.defaultLots]);

  const candles = useMemo(() => resample(candles1m, timeframe), [candles1m, timeframe]);

  const marked = useMemo(() => positions.map((p) => {
    const px = priceRef.current?.[p.symbol] ?? lastPrice ?? p.entry;
    const pnl = pnlUsd(p.symbol, p.side, p.entry, px, p.lots);
    return { ...p, mark: px, pnl };
  }), [positions, lastPrice]);

  const status = useMemo(() => {
    const broker = brokers.find((b) => b.id === activeBrokerId);
    return {
      api: "operational",
      marketData: wsState === "live" ? "live" : "simulated",
      websocket: wsState,
      engine: automation.stopped ? "stopped" : "running",
      broker: broker ? (broker.id === "paper" ? "paper" : broker.status) : "none",
    };
  }, [wsState, automation.stopped, brokers, activeBrokerId]);

  const value = useMemo(() => ({
    symbol, setSymbol, timeframe, setTimeframe, timeframes: TIMEFRAMES,
    candles, candles1m, asian, lastPrice, harsi, pulse, breakout, session,
    brokers, activeBrokerId, setActiveBrokerId, mode, setMode,
    positions: marked, orders, closed, alerts, signals, toasts, audit, backtests, setBacktests,
    watchlist, setWatchlist, strategies, setStrategies, automation, setAutomation,
    risk, setRisk, settings, setSettings,
    openPosition, closePosition, placePendingOrder, cancelOrder,
    connectBroker, disconnectBroker, executeFromAlert, dismissToast, recordSignal,
    addAudit, status, marketSourceLabel: marketSourceLabel(symbol),
    updatePosition: (id, patch) => { setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))); setAudit((p) => logAudit(p, { kind: "strategy_changed", message: `Position ${id} updated` })); },
    closeAll: () => { positionsRef.current.forEach((p) => closePosition(p.id, "Close all")); },
    toggleStrategy: (id) => { setStrategies((prev) => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id]?.enabled } })); setAudit((p) => logAudit(p, { kind: "strategy_changed", message: `Strategy ${id} toggled` })); },
    updateStrategy: (id, patch) => { setStrategies((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } })); setAudit((p) => logAudit(p, { kind: "strategy_changed", message: `Strategy ${id} config updated` })); },
    stopAllAutomation: () => { setAutomation((prev) => ({ ...prev, stopped: true })); setAudit((p) => logAudit(p, { kind: "automation_stopped", message: "STOP ALL AUTOMATION engaged" })); },
    prices: priceRef.current || {},
    requestNotifications: () => { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); },
  }), [symbol, timeframe, candles, candles1m, asian, lastPrice, harsi, pulse, breakout, session, brokers, activeBrokerId, mode, marked, orders, closed, alerts, signals, toasts, audit, backtests, watchlist, strategies, automation, risk, settings, openPosition, closePosition, placePendingOrder, cancelOrder, connectBroker, disconnectBroker, executeFromAlert, dismissToast, recordSignal, addAudit, status]);

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used inside TradingProvider");
  return ctx;
}
