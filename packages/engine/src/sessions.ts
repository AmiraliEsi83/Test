const LONDON_TZ = "Europe/London";
const NY_TZ = "America/New_York";
const TOKYO_TZ = "Asia/Tokyo";
const SYDNEY_TZ = "Australia/Sydney";

export function zonedParts(date: Date = new Date(), timeZone = LONDON_TZ) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday as string,
  };
}

export function minutesInZone(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  return p.hour * 60 + p.minute + p.second / 60;
}

export function londonMinutes(date: Date = new Date()): number {
  return minutesInZone(date, LONDON_TZ);
}

export function isWeekendLondon(date: Date = new Date()): boolean {
  const p = zonedParts(date);
  return p.weekday === "Sat" || p.weekday === "Sun";
}

export function weekdayShort(date: Date = new Date(), timeZone = LONDON_TZ): string {
  return zonedParts(date, timeZone).weekday;
}

export function nextLondonOpen(date: Date = new Date()): Date {
  const p = zonedParts(date);
  const openMin = 8 * 60;
  const nowMin = p.hour * 60 + p.minute + p.second / 60;
  const addDays = nowMin >= openMin ? 1 : 0;
  for (let i = 0; i < 8; i += 1) {
    const probe = new Date(date.getTime() + (addDays + i) * 86400000);
    const zp = zonedParts(probe);
    if (zp.weekday === "Sat" || zp.weekday === "Sun") continue;
    const deltaMin = (addDays + i) * 1440 + (openMin - nowMin);
    return new Date(date.getTime() + deltaMin * 60000);
  }
  return new Date(date.getTime() + (openMin - nowMin + 1440) * 60000);
}

export function countdownTo(target: Date, now = new Date()) {
  const ms = Math.max(0, target.getTime() - now.getTime());
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { ms, h, m, s, label: `${pad(h)}:${pad(m)}:${pad(s)}` };
}

export interface SessionBand {
  key: string;
  label: string;
  startHour: number;
  endHour: number;
  timeZone: string;
  color: string;
}

export const SESSION_DEFS: SessionBand[] = [
  { key: "sydney", label: "Sydney", startHour: 7, endHour: 16, timeZone: SYDNEY_TZ, color: "#67e8f9" },
  { key: "tokyo", label: "Tokyo", startHour: 9, endHour: 18, timeZone: TOKYO_TZ, color: "#c4b5fd" },
  { key: "london", label: "London", startHour: 8, endHour: 16, timeZone: LONDON_TZ, color: "#5eead4" },
  { key: "newyork", label: "New York", startHour: 8, endHour: 17, timeZone: NY_TZ, color: "#7aa2ff" },
];

export function sessionStatus(def: SessionBand, date = new Date()) {
  const p = zonedParts(date, def.timeZone);
  const weekend = p.weekday === "Sat" || p.weekday === "Sun";
  const mins = p.hour * 60 + p.minute + p.second / 60;
  const start = def.startHour * 60;
  const end = def.endHour * 60;
  const open = !weekend && mins >= start && mins < end;
  let nextChange: Date;
  if (weekend || mins >= end) {
    const days = p.weekday === "Fri" && mins >= end ? 3 : p.weekday === "Sat" ? 2 : p.weekday === "Sun" ? 1 : mins >= end ? 1 : 0;
    const zpNow = mins;
    const delta = days * 1440 + (start - zpNow);
    nextChange = new Date(date.getTime() + delta * 60000);
  } else if (mins < start) {
    nextChange = new Date(date.getTime() + (start - mins) * 60000);
  } else {
    nextChange = new Date(date.getTime() + (end - mins) * 60000);
  }
  return {
    ...def,
    open,
    weekend,
    localHour: p.hour,
    localMinute: p.minute,
    countdown: countdownTo(nextChange, date),
    nextChange,
  };
}

export function overlappingSessions(date = new Date()) {
  return SESSION_DEFS.map((d) => sessionStatus(d, date)).filter((s) => s.open);
}

export interface FxSessionState {
  name: string;
  key: string;
  inHarsiWindow: boolean;
  minutesToLondon: number;
  volatility: number;
  note: string;
}

export function getSessionState(date: Date = new Date(), forceLondonWindow = false): FxSessionState {
  if (forceLondonWindow) {
    return {
      name: "London prep",
      key: "london-prep",
      inHarsiWindow: true,
      minutesToLondon: 12,
      volatility: 2.15,
      note: "T-15 London window (demo clock)",
    };
  }

  const mins = londonMinutes(date);
  const weekend = isWeekendLondon(date);

  if (weekend) {
    return {
      name: "Weekend",
      key: "weekend",
      inHarsiWindow: false,
      minutesToLondon: countdownTo(nextLondonOpen(date), date).ms / 60000,
      volatility: 0.12,
      note: "Cash FX closed — next London open queued",
    };
  }

  if (mins >= 7 * 60 + 45 && mins < 8 * 60 + 30) {
    return {
      name: "London prep",
      key: "london-prep",
      inHarsiWindow: mins < 8 * 60 + 5,
      minutesToLondon: Math.max(0, 8 * 60 - mins),
      volatility: 2.2,
      note: "London opens in 15 minutes — HARSI window",
    };
  }
  if (mins >= 8 * 60 && mins < 12 * 60) {
    return {
      name: "London",
      key: "london",
      inHarsiWindow: mins < 8 * 60 + 5,
      minutesToLondon: 0,
      volatility: 1.45,
      note: "London cash session",
    };
  }
  if (mins >= 12 * 60 && mins < 13 * 60) {
    return {
      name: "London lunch",
      key: "lunch",
      inHarsiWindow: false,
      minutesToLondon: 0,
      volatility: 0.7,
      note: "Midday compression",
    };
  }
  if (mins >= 13 * 60 && mins < 17 * 60) {
    return {
      name: "NY overlap",
      key: "overlap",
      inHarsiWindow: false,
      minutesToLondon: 0,
      volatility: 1.85,
      note: "London / New York overlap",
    };
  }
  if (mins >= 17 * 60 && mins < 21 * 60) {
    return {
      name: "New York",
      key: "ny",
      inHarsiWindow: false,
      minutesToLondon: 0,
      volatility: 1.25,
      note: "New York session",
    };
  }
  return {
    name: "Asia",
    key: "asia",
    inHarsiWindow: false,
    minutesToLondon: Math.max(0, 8 * 60 - mins + (mins > 21 * 60 ? 1440 : 0)),
    volatility: 0.42,
    note: "Asian range building",
  };
}

export const SESSION_BANDS = [
  { key: "asia", label: "Asia", start: 0, end: 7.75, color: "#7c6cff" },
  { key: "harsi", label: "HARSI T-15", start: 7.75, end: 8.08, color: "#f0c36a" },
  { key: "london", label: "London", start: 8, end: 16, color: "#5eead4" },
  { key: "ny", label: "New York", start: 13, end: 21, color: "#5b9dff" },
];

export function isHarsiWindow(date: Date, cfg: { windowMinutesBefore: number; windowMinutesAfter: number }): boolean {
  const mins = londonMinutes(date);
  const open = 8 * 60;
  return mins >= open - cfg.windowMinutesBefore && mins < open + cfg.windowMinutesAfter;
}

export function asianRangeWindow(date: Date) {
  const mins = londonMinutes(date);
  return mins >= 0 && mins < 7 * 60 + 45;
}

export function previousSessionHighLow(
  candles: { time: number; high: number; low: number }[],
  session: "london" | "asia" | "ny" = "london"
) {
  const ranges = {
    asia: [0, 7.75],
    london: [8, 16],
    ny: [13, 21],
  }[session];
  const start = ranges[0] * 60;
  const end = ranges[1] * 60;
  let high = -Infinity;
  let low = Infinity;
  let found = false;
  const today = zonedParts(new Date(candles[candles.length - 1]?.time * 1000 || Date.now()));
  for (const c of candles) {
    const p = zonedParts(new Date(c.time * 1000));
    const sameDay = p.year === today.year && p.month === today.month && p.day === today.day;
    if (sameDay) continue;
    const m = p.hour * 60 + p.minute;
    if (m >= start && m < end) {
      high = Math.max(high, c.high);
      low = Math.min(low, c.low);
      found = true;
    }
  }
  if (!found) {
    const slice = candles.slice(-120);
    high = Math.max(...slice.map((c) => c.high));
    low = Math.min(...slice.map((c) => c.low));
  }
  return { high, low };
}
