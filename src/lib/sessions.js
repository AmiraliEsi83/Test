const LONDON_TZ = "Europe/London";

export function zonedParts(date = new Date(), timeZone = LONDON_TZ) {
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
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
  };
}

export function londonMinutes(date = new Date()) {
  const p = zonedParts(date);
  return p.hour * 60 + p.minute + p.second / 60;
}

export function isWeekendLondon(date = new Date()) {
  const p = zonedParts(date);
  return p.weekday === "Sat" || p.weekday === "Sun";
}

export function nextLondonOpen(date = new Date()) {
  const p = zonedParts(date);
  const openMin = 8 * 60;
  const nowMin = p.hour * 60 + p.minute + p.second / 60;
  const d = new Date(date.getTime());
  let addDays = 0;
  if (nowMin >= openMin) addDays = 1;
  d.setUTCDate(d.getUTCDate() + addDays);
  for (let i = 0; i < 8; i += 1) {
    const probe = new Date(date.getTime() + (addDays + i) * 86400000);
    probe.setMilliseconds(0);
    if (!isWeekendLondon(probe) || i === 0) {
      const zp = zonedParts(probe);
      if (zp.weekday === "Sat") continue;
      if (zp.weekday === "Sun") continue;
      const target = new Date(date.getTime());
      const deltaMin = (addDays + i) * 1440 + (openMin - nowMin);
      return new Date(date.getTime() + deltaMin * 60000);
    }
  }
  return new Date(date.getTime() + (openMin - nowMin + 1440) * 60000);
}

export function countdownToLondon(date = new Date()) {
  const open = nextLondonOpen(date);
  const ms = Math.max(0, open.getTime() - date.getTime());
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { open, ms, h, m, s, label: `${pad(h)}:${pad(m)}:${pad(s)}` };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export function getSessionState(date = new Date(), forceLondonWindow = false) {
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
      minutesToLondon: countdownToLondon(date).ms / 60000,
      volatility: 0.12,
      note: "Markets closed — next London open queued",
    };
  }

  if (mins >= 7 * 60 + 45 && mins < 8 * 60 + 30) {
    return {
      name: "London prep",
      key: "london-prep",
      inHarsiWindow: mins < 8 * 60 + 5,
      minutesToLondon: Math.max(0, 8 * 60 - mins),
      volatility: 2.2,
      note: "London opens in 15 minutes — Harsi window",
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
  if (mins >= 13 * 60 && mins < 21 * 60) {
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
  { key: "harsi", label: "Harsi T-15", start: 7.75, end: 8.08, color: "#f0c36a" },
  { key: "london", label: "London", start: 8, end: 16, color: "#5eead4" },
  { key: "ny", label: "New York", start: 13, end: 21, color: "#5b9dff" },
];
