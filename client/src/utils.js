import { MULT, SESSIONS } from './constants.js';

export const pad = (n) => String(n).padStart(2, '0');
export const money = (v, sign = true) =>
  (v < 0 ? '-' : sign && v > 0 ? '+' : '') +
  '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const numOrNull = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
export const stratName = (t) => (t.strategy === 'Others' && t.strategyOther ? t.strategyOther : t.strategy);
export const tfName = (t) => (t.timeFrame === 'Other' && t.timeFrameOther ? t.timeFrameOther : t.timeFrame);

/* ---------- Indian Standard Time helpers (UTC+5:30) ---------- */
const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
export function istParts(d) {
  const p = {};
  fmt.formatToParts(new Date(d)).forEach((x) => { p[x.type] = x.value; });
  let h = +p.hour;
  if (h === 24) h = 0;
  return { y: +p.year, mo: +p.month, d: +p.day, h, mi: +p.minute };
}
export const toInputIST = (d) => {
  const p = istParts(d);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
};
export const fromInputIST = (s) => new Date(s + ':00+05:30').toISOString();
export const nowInputIST = () => toInputIST(new Date());
export const todayIST = () => nowInputIST().slice(0, 10);
export const fmtDT = (d) => {
  const p = istParts(d);
  const mon = new Date(Date.UTC(p.y, p.mo - 1, 1)).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${pad(p.d)} ${mon} ${p.y}, ${pad(p.h)}:${pad(p.mi)}`;
};
export const fmtShortDate = (d) => {
  const p = istParts(d);
  const mon = new Date(Date.UTC(p.y, p.mo - 1, 1)).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${pad(p.d)} ${mon}`;
};

/* ---------- Sessions ---------- */
export function activeSessions(mins) {
  return SESSIONS.filter((s) => s.rng.some(([a, b]) => mins >= a && mins < b));
}
// dtInput is 'YYYY-MM-DDTHH:mm' (IST). Returns the most volatile open session + all open ones.
export function detectSession(dtInput) {
  const t = (dtInput || '').split('T')[1] || '00:00';
  const [h, m] = t.split(':').map(Number);
  const mins = h * 60 + m;
  const act = activeSessions(mins);
  return { best: act[act.length - 1].k, active: act.map((a) => a.k), mins };
}

/* ---------- Trade maths ---------- */
export const riskUSD = (t) => Math.abs(t.entry - t.sl) * t.size * MULT[t.market];
export const calcPnl = (market, direction, entry, close, size) =>
  (close - entry) * (direction === 'Buy' ? 1 : -1) * size * MULT[market];

export function summarize(list) {
  const n = list.length;
  const wins = list.filter((t) => t.pnl > 0);
  const losses = list.filter((t) => t.pnl <= 0);
  const gp = wins.reduce((a, t) => a + t.pnl, 0);
  const gl = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const rs = list.filter((t) => riskUSD(t) > 0).map((t) => t.pnl / riskUSD(t));
  const known = list.filter((t) => t.plan === true || t.plan === false);
  return {
    n, gp, gl, net: gp - gl,
    winRate: n ? wins.length / n : 0,
    pf: gl > 0 ? gp / gl : null,
    avgWin: wins.length ? gp / wins.length : 0,
    avgLoss: losses.length ? gl / losses.length : 0,
    avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0,
    best: n ? Math.max(...list.map((t) => t.pnl)) : 0,
    worst: n ? Math.min(...list.map((t) => t.pnl)) : 0,
    plan: known.length ? known.filter((t) => t.plan).length / known.length : null
  };
}
export function groupCount(list, fn) {
  const m = {};
  list.forEach((t) => { const k = fn(t); m[k] = (m[k] || 0) + 1; });
  return m;
}
export function groupSum(list, fn) {
  const m = {};
  list.forEach((t) => { const k = fn(t); m[k] = (m[k] || 0) + t.pnl; });
  return m;
}

/* ---------- Report periods (weeks run Monday to Sunday, in IST) ---------- */
const dayNum = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);
const parseAnchor = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; };

export function inPeriod(dt, period, anchor) {
  const p = istParts(dt);
  const a = parseAnchor(anchor);
  if (period === 'year') return p.y === a.y;
  if (period === 'month') return p.y === a.y && p.mo === a.m;
  const dow = (new Date(Date.UTC(a.y, a.m - 1, a.d)).getUTCDay() + 6) % 7;
  const start = dayNum(a.y, a.m, a.d) - dow;
  const day = dayNum(p.y, p.mo, p.d);
  return day >= start && day <= start + 6;
}
export function periodTitle(period, anchor) {
  const a = parseAnchor(anchor);
  const f = (ms, o) => new Date(ms).toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' });
  if (period === 'year') return 'Year ' + a.y;
  if (period === 'month') return f(Date.UTC(a.y, a.m - 1, 1), { month: 'long', year: 'numeric' });
  const dow = (new Date(Date.UTC(a.y, a.m - 1, a.d)).getUTCDay() + 6) % 7;
  const s = Date.UTC(a.y, a.m - 1, a.d - dow);
  const e = Date.UTC(a.y, a.m - 1, a.d - dow + 6);
  return `Week: ${f(s, { day: 'numeric', month: 'short' })} to ${f(e, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
