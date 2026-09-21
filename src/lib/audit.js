export function logAudit(prev, event) {
  const entry = { id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), ...event };
  return [entry, ...(prev || [])].slice(0, 200);
}

export const AUDIT_LABELS = {
  login: "Login",
  logout: "Logout",
  strategy_changed: "Strategy changed",
  broker_connected: "Broker connected",
  broker_disconnected: "Broker disconnected",
  automation_enabled: "Automation enabled",
  automation_stopped: "Automation stopped",
  order_submitted: "Order submitted",
  order_cancelled: "Order cancelled",
  position_closed: "Position closed",
  risk_blocked: "Risk blocked order",
  subscription_changed: "Subscription changed",
};
