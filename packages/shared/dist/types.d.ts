export type SubscriptionTier = 'FREE' | 'TRADER' | 'PRO';
export interface User {
    id: string;
    email: string;
    name: string;
    subscriptionTier: SubscriptionTier;
    createdAt: string;
}
export type AssetKind = 'fx' | 'metal' | 'crypto' | 'indices';
export interface Instrument {
    id: string;
    symbol: string;
    label: string;
    pip: number;
    digits: number;
    basePrice: number;
    spread: number;
    kind: AssetKind;
    lotSize: number;
    tvSymbol: string;
    minLot: number;
    maxLot: number;
}
export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
export interface Tick {
    symbol: string;
    price: number;
    bid: number;
    ask: number;
    timestamp: number;
    volume: number;
}
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
export type SignalSide = 'BUY' | 'SELL';
export type SignalStatus = 'ACTIVE' | 'EXPIRED' | 'HIT_TP' | 'HIT_SL' | 'CANCELLED';
export interface SignalCondition {
    name: string;
    passed: boolean;
    detail: string;
}
export interface Signal {
    id: string;
    strategyId: string;
    strategyName: string;
    symbol: string;
    timeframe: string;
    side: SignalSide;
    price: number;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    riskReward: string;
    timestamp: number;
    status: SignalStatus;
    resultPips?: number;
    reason: string;
    conditions: SignalCondition[];
    metadata?: Record<string, any>;
}
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP';
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
export type ExecutionMode = 'PAPER' | 'LIVE';
export interface OrderRequest {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    lots: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
    strategyId?: string;
    brokerType?: string;
    mode?: ExecutionMode;
}
export interface Order {
    id: string;
    userId: string;
    symbol: string;
    side: OrderSide;
    type: OrderType;
    lots: number;
    price: number;
    stopLoss?: number;
    takeProfit?: number;
    status: OrderStatus;
    filledAt?: string;
    filledPrice?: number;
    commission: number;
    slippage: number;
    reason?: string;
    strategyId?: string;
    brokerType: string;
    mode: ExecutionMode;
    createdAt: string;
    updatedAt: string;
}
export type PositionSide = 'LONG' | 'SHORT';
export type PositionStatus = 'OPEN' | 'CLOSED';
export interface Position {
    id: string;
    userId: string;
    symbol: string;
    side: PositionSide;
    lots: number;
    entryPrice: number;
    currentPrice: number;
    stopLoss?: number;
    takeProfit?: number;
    unrealizedPnl: number;
    unrealizedPnlPips: number;
    realizedPnl: number;
    strategyId?: string;
    brokerType: string;
    mode: ExecutionMode;
    openedAt: string;
    closedAt?: string;
}
export interface AccountOverview {
    balance: number;
    equity: number;
    cash: number;
    marginUsed: number;
    buyingPower: number;
    unrealizedPnl: number;
    realizedPnl: number;
    todayPnl: number;
    totalReturnPct: number;
    openRiskPct: number;
    maxDrawdownPct: number;
    currency: string;
    mode: ExecutionMode;
}
export type BrokerType = 'paper' | 'alpaca' | 'oanda' | 'ibkr';
export type BrokerStatus = 'CONNECTED' | 'NOT_CONFIGURED' | 'NOT_CONNECTED' | 'SIMULATED' | 'ERROR';
export interface BrokerConnectionInfo {
    id: string;
    brokerType: BrokerType;
    name: string;
    status: BrokerStatus;
    environment: 'sandbox' | 'live';
    accountId?: string;
    lastSync?: string;
    hasCredentials: boolean;
    permissions: string[];
}
export interface RiskSettings {
    userId: string;
    maxRiskPerTradePct: number;
    maxPositionSizeLots: number;
    maxDailyLossUsd: number;
    maxDailyLossPct: number;
    maxOpenPositions: number;
    maxExposurePerAssetLots: number;
    consecutiveLossThreshold: number;
    cooldownMinutes: number;
    killSwitchActive: boolean;
    killSwitchReason?: string;
}
export interface StrategyAutomationRule {
    alerts: boolean;
    paperAutoExecute: boolean;
    liveAutoExecute: boolean;
    confirmedLiveRisk: boolean;
}
export interface AutomationSettings {
    userId: string;
    strategies: Record<string, StrategyAutomationRule>;
    masterEmergencyStop: boolean;
}
export interface MarketSession {
    name: string;
    key: 'sydney' | 'tokyo' | 'london' | 'new-york';
    openUtcHour: number;
    closeUtcHour: number;
    isOpen: boolean;
    nextOpenMinutes: number;
    nextCloseMinutes: number;
    note: string;
}
export interface EconomicEvent {
    id: string;
    title: string;
    country: string;
    currency: string;
    time: string;
    timestamp: number;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    forecast?: string;
    previous?: string;
    actual?: string;
    affectedSymbols: string[];
}
export interface AuditLogEntry {
    id: string;
    userId: string;
    action: string;
    category: 'AUTH' | 'ORDER' | 'POSITION' | 'STRATEGY' | 'RISK' | 'BROKER' | 'AUTOMATION';
    details: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    timestamp: string;
}
export interface BacktestRequest {
    strategyId: string;
    symbol: string;
    timeframe: string;
    startDate: string;
    endDate: string;
    startingBalance: number;
    riskPct: number;
    params: Record<string, any>;
}
export interface BacktestTrade {
    id: string;
    entryTime: number;
    exitTime: number;
    symbol: string;
    side: OrderSide;
    lots: number;
    entryPrice: number;
    exitPrice: number;
    pnlUsd: number;
    pnlPips: number;
    returnPct: number;
    reason: string;
}
export interface BacktestResult {
    id: string;
    strategyId: string;
    strategyName: string;
    symbol: string;
    timeframe: string;
    startDate: string;
    endDate: string;
    startingBalance: number;
    finalBalance: number;
    netProfit: number;
    returnPct: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    profitFactor: number;
    maxDrawdownPct: number;
    averageTrade: number;
    avgRiskReward: number;
    equityCurve: Array<{
        time: number;
        equity: number;
    }>;
    trades: BacktestTrade[];
    parameters: Record<string, any>;
    createdAt: string;
}
export interface SystemStatus {
    api: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
    marketData: 'CONNECTED' | 'RECONNECTING' | 'OFFLINE';
    websocket: 'ACTIVE' | 'CONNECTING' | 'OFFLINE';
    strategyEngine: 'RUNNING' | 'PAUSED' | 'ERROR';
    brokerPaper: 'ACTIVE' | 'ERROR';
    brokerLive: 'NOT_CONFIGURED' | 'CONNECTED' | 'DISCONNECTED';
    latencyMs: number;
    activeSockets: number;
    uptimeSeconds: number;
}
