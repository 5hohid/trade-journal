import * as XLSX from 'xlsx';
import { MARKETS, STRATEGIES, TFS, SESSIONS, EXITS, MOODS } from './constants.js';
import { istParts, pad, summarize, stratName, tfName, fromInputIST, detectSession } from './utils.js';

const SESSION_NAMES = SESSIONS.map((s) => s.k);
const dtText = (d) => { const p = istParts(d); return `${p.y}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}`; };

export function tradesToRows(list, withUser = false) {
  return list.slice().sort((a, b) => new Date(a.dt) - new Date(b.dt)).map((t) => ({
    ...(withUser ? { User: t.username } : {}),
    'Date & time (IST)': dtText(t.dt),
    Market: t.market,
    Direction: t.direction,
    Strategy: stratName(t),
    'Time frame': tfName(t),
    Session: t.session,
    'Entry price': t.entry,
    'Stop loss': t.sl,
    'Take profit': t.tp ?? '',
    'Close price': t.close,
    Exit: t.exit,
    'Position size': t.size,
    'RR ratio': t.rr != null ? +Number(t.rr).toFixed(2) : '',
    'P&L (USD)': t.pnl,
    Mood: t.mood || '',
    'Followed plan': t.plan === true ? 'Yes' : t.plan === false ? 'No' : '',
    Notes: t.notes || ''
  }));
}

export function downloadExcel(list, fileName, withUser = false) {
  const rows = tradesToRows(list, withUser);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] || { a: 1 }).map((k) => ({ wch: Math.max(12, k.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Trades');
  const s = summarize(list);
  const summary = [
    ['Metric', 'Value'],
    ['Trades', s.n],
    ['Win rate %', +(s.winRate * 100).toFixed(1)],
    ['Net P&L (USD)', +s.net.toFixed(2)],
    ['Gross profit (USD)', +s.gp.toFixed(2)],
    ['Gross loss (USD)', +s.gl.toFixed(2)],
    ['Profit factor', s.pf != null ? +s.pf.toFixed(2) : 'n/a']
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');
  XLSX.writeFile(wb, fileName + '.xlsx');
}

export async function readRows(file) {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
}

const n = (v) => (v === '' || v == null ? NaN : Number(v));

// Turns rows from our own Excel file back into trades. Returns [{ body, extras }].
export function rowsToTrades(rows) {
  const out = [];
  let bad = 0;
  rows.forEach((r) => {
    const text = String(r['Date & time (IST)'] || '').trim().replace(' ', 'T').slice(0, 16);
    const market = String(r.Market || '').trim();
    const direction = String(r.Direction || '').trim();
    const entry = n(r['Entry price']), sl = n(r['Stop loss']), close = n(r['Close price']);
    const size = n(r['Position size']), pnl = n(r['P&L (USD)']);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text) || !MARKETS.some((m) => m.k === market) ||
        !['Buy', 'Sell'].includes(direction) || [entry, sl, close, size, pnl].some(Number.isNaN)) { bad++; return; }
    const strat = String(r.Strategy || '').trim();
    const tf = String(r['Time frame'] || '').trim();
    const sess = String(r.Session || '').trim();
    const exit = String(r.Exit || '').trim();
    const rr = n(r['RR ratio']);
    const tp = n(r['Take profit']);
    const plan = String(r['Followed plan'] || '').trim();
    out.push({
      body: {
        dt: fromInputIST(text), market, direction,
        strategy: STRATEGIES.includes(strat) ? strat : 'Others',
        strategyOther: STRATEGIES.includes(strat) ? '' : strat.slice(0, 60),
        timeFrame: TFS.includes(tf) ? tf : 'Other',
        timeFrameOther: TFS.includes(tf) ? '' : tf.slice(0, 20),
        session: SESSION_NAMES.includes(sess) ? sess : detectSession(text).best,
        entry, sl, close, size, pnl,
        exit: EXITS.includes(exit) ? exit : 'Other',
        rr: Number.isNaN(rr) ? null : rr
      },
      extras: {
        tp: Number.isNaN(tp) ? null : tp,
        mood: MOODS.includes(r.Mood) ? r.Mood : '',
        plan: plan === 'Yes' ? true : plan === 'No' ? false : null,
        notes: String(r.Notes || '').slice(0, 2000)
      }
    });
  });
  return { list: out, bad };
}

// A key to spot trades that already exist (so importing the same file twice adds nothing new)
export const tradeKey = (t) => `${new Date(t.dt).toISOString()}|${t.market}|${t.entry}|${t.close}`;
