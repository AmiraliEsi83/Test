export const ECON_PROVIDER = process.env.REACT_APP_ECON_PROVIDER || null;

export function getEconomicEvents() {
  if (!ECON_PROVIDER) return { configured: false, events: [] };
  return { configured: true, events: [] };
}

export const SESSIONS = [
  { key: "sydney", label: "Sydney", openH: 21, closeH: 6, tz: "Australia/Sydney" },
  { key: "tokyo", label: "Tokyo", openH: 0, closeH: 9, tz: "Asia/Tokyo" },
  { key: "london", label: "London", openH: 8, closeH: 16.5, tz: "Europe/London" },
  { key: "newyork", label: "New York", openH: 13.5, closeH: 21, tz: "America/New_York" },
];

export function sessionOpenStates(now = new Date()) {
  const londonH = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hourCycle: "h23" }).format(now)
  );
  const nyH =
    Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", hourCycle: "h23" }).format(now)) +
    new Date().getMinutes() / 60;
  const tokyoH = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", hourCycle: "h23" }).format(now));
  const sydneyH = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Australia/Sydney", hour: "2-digit", hourCycle: "h23" }).format(now));
  const isOpen = (h, o, c) => (o < c ? h >= o && h < c : h >= o || h < c);
  return [
    { key: "sydney", label: "Sydney", open: isOpen(sydneyH, 7, 16), hour: sydneyH },
    { key: "tokyo", label: "Tokyo", open: isOpen(tokyoH, 9, 18), hour: tokyoH },
    { key: "london", label: "London", open: londonH >= 8 && londonH < 16.5, hour: londonH },
    { key: "newyork", label: "New York", open: nyH >= 13.5 && nyH < 21, hour: nyH },
  ];
}
