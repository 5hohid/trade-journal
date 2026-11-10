import { useEffect, useState } from 'react';
import Chips from './Chips.jsx';
import SessionClock from './SessionClock.jsx';
import { api } from '../api.js';
import { MARKETS, MULT, SIZE_HINT, STRATEGIES, TFS, SESSIONS, EXITS, MOODS } from '../constants.js';
import { draft, prefs } from '../storage.js';
import { calcPnl, detectSession, fromInputIST, money, nowInputIST, numOrNull, toInputIST } from '../utils.js';

const NO_TOUCH = { rr: false, pnl: false, exit: false, session: false };

const blank = () => {
  const p = prefs.get();
  return {
    dt: nowInputIST(), market: p.lastMarket || 'XAUUSD', direction: 'Buy',
    strategy: p.lastStrategy || STRATEGIES[0], strategyOther: '',
    timeFrame: p.lastTf || '5M', timeFrameOther: '', session: '',
    entry: '', sl: '', tp: '', close: '', size: '', rr: '', pnl: '',
    exit: 'Manual', mood: 'Calm', plan: true, notes: ''
  };
};

const fromTrade = (t) => ({
  dt: toInputIST(t.dt), market: t.market, direction: t.direction,
  strategy: t.strategy, strategyOther: t.strategyOther || '',
  timeFrame: t.timeFrame, timeFrameOther: t.timeFrameOther || '', session: t.session,
  entry: String(t.entry), sl: String(t.sl), tp: t.tp == null ? '' : String(t.tp), close: String(t.close),
  size: String(t.size), rr: t.rr == null ? '' : String(t.rr), pnl: String(t.pnl),
  exit: t.exit, mood: t.mood || 'Calm', plan: t.plan !== false, notes: t.notes || ''
});

export default function TradeForm({ trade, targetUid, onSaved, onCancel }) {
  const saved = trade ? null : draft.get();
  const [f, setF] = useState(() => (trade ? fromTrade(trade) : saved?.f || blank()));
  const [touched, setTouched] = useState(() => (trade ? { rr: true, pnl: true, exit: true, session: true } : saved?.touched || NO_TOUCH));
  const [restored] = useState(!trade && !!saved);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // keep an unsaved draft in this browser
  useEffect(() => { if (!trade) draft.set({ f, touched }); }, [f, touched, trade]);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const touch = (k) => setTouched((t) => ({ ...t, [k]: true }));

  /* ----- live calculations ----- */
  const e = numOrNull(f.entry), sl = numOrNull(f.sl), tp = numOrNull(f.tp), cl = numOrNull(f.close), sz = numOrNull(f.size);
  const mult = MULT[f.market];
  const autoRR = e != null && sl != null && tp != null && e !== sl ? Math.abs(tp - e) / Math.abs(e - sl) : null;
  const autoPnl = e != null && cl != null && sz != null ? calcPnl(f.market, f.direction, e, cl, sz) : null;
  const det = detectSession(f.dt);
  let autoExit = 'Manual';
  if (cl != null && sl != null && Math.abs(cl - sl) < 1e-9) autoExit = 'Stop Loss';
  else if (cl != null && tp != null && Math.abs(cl - tp) < 1e-9) autoExit = 'Take Profit';

  const rrVal = touched.rr ? f.rr : autoRR != null ? autoRR.toFixed(2) : '';
  const pnlVal = touched.pnl ? f.pnl : autoPnl != null ? autoPnl.toFixed(2) : '';
  const sessionVal = touched.session && f.session ? f.session : det.best;
  const exitVal = touched.exit ? f.exit : autoExit;

  const risk = e != null && sl != null && sz != null ? Math.abs(e - sl) * sz * mult : null;
  const pnlNum = numOrNull(pnlVal);
  const rMult = risk && pnlNum != null ? pnlNum / risk : null;

  const warns = [];
  if (e != null && sl != null && ((f.direction === 'Buy' && sl >= e) || (f.direction === 'Sell' && sl <= e)))
    warns.push(`For a ${f.direction} trade the stop loss should be ${f.direction === 'Buy' ? 'below' : 'above'} the entry.`);
  if (e != null && tp != null && ((f.direction === 'Buy' && tp <= e) || (f.direction === 'Sell' && tp >= e)))
    warns.push(`For a ${f.direction} trade the take profit should be ${f.direction === 'Buy' ? 'above' : 'below'} the entry.`);

  function clearForm() {
    setF(blank()); setTouched(NO_TOUCH); draft.clear(); setErr('');
  }

  async function submit(ev) {
    ev.preventDefault();
    setErr('');
    const miss = [];
    if (!f.dt) miss.push('date & time');
    if (e == null) miss.push('entry price');
    if (sl == null) miss.push('stop loss');
    if (cl == null) miss.push('close price');
    if (sz == null) miss.push('position size');
    if (pnlNum == null) miss.push('profit & loss');
    if (miss.length) { setErr('Please fill: ' + miss.join(', ')); return; }

    const body = {
      dt: fromInputIST(f.dt), market: f.market, direction: f.direction,
      strategy: f.strategy, strategyOther: f.strategy === 'Others' ? f.strategyOther.trim() : '',
      timeFrame: f.timeFrame, timeFrameOther: f.timeFrame === 'Other' ? f.timeFrameOther.trim() : '',
      session: sessionVal, entry: e, sl, close: cl, exit: exitVal, size: sz,
      rr: numOrNull(rrVal), pnl: pnlNum
    };
    const extras = { tp, mood: f.mood, plan: f.plan, notes: f.notes.trim() };

    setBusy(true);
    try {
      const result = trade ? await api.update(trade._id, body, targetUid) : await api.create(body, targetUid);
      if (!trade) {
        prefs.patch({ lastMarket: f.market, lastStrategy: f.strategy, lastTf: f.timeFrame });
        draft.clear(); setF(blank()); setTouched(NO_TOUCH);
      }
      onSaved(result, extras, !!trade);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      <div>
        <div className="panel">
          <h3>Setup</h3>
          {restored && <p className="hint" style={{ marginTop: 0 }}>Your unsaved draft was restored. Use "Clear form" to start fresh.</p>}
          <div className="row c2">
            <div>
              <label className="lbl" htmlFor="f-dt">Date &amp; time (IST)</label>
              <input id="f-dt" type="datetime-local" value={f.dt} required
                onChange={(ev) => { set('dt', ev.target.value); setTouched((t) => ({ ...t, session: false })); }} />
            </div>
            <div>
              <span className="lbl">Direction</span>
              <Chips name="dir" kind="dir" options={['Buy', 'Sell']} value={f.direction} onChange={(v) => set('direction', v)} />
            </div>
          </div>
          <div className="row">
            <div>
              <span className="lbl">Market</span>
              <Chips name="market" kind="market" options={MARKETS.map((m) => ({ value: m.k, label: m.label }))}
                value={f.market} onChange={(v) => set('market', v)} />
            </div>
          </div>
          <div className="row">
            <div>
              <span className="lbl">Strategy</span>
              <Chips name="strat" options={STRATEGIES} value={f.strategy} onChange={(v) => set('strategy', v)} />
              {f.strategy === 'Others' && (
                <input type="text" className="inline-other" placeholder="Name your strategy" maxLength={60}
                  value={f.strategyOther} onChange={(ev) => set('strategyOther', ev.target.value)} />
              )}
            </div>
          </div>
          <div className="row">
            <div>
              <span className="lbl">Time frame</span>
              <Chips name="tf" options={TFS} value={f.timeFrame} onChange={(v) => set('timeFrame', v)} />
              {f.timeFrame === 'Other' && (
                <input type="text" className="inline-other" placeholder="e.g. 2H, Daily" maxLength={20}
                  value={f.timeFrameOther} onChange={(ev) => set('timeFrameOther', ev.target.value)} />
              )}
            </div>
          </div>
          <div className="row" style={{ marginBottom: 0 }}>
            <div>
              <span className="lbl">Session <span className="hint" style={{ display: 'inline' }}>(picked from your time, change if needed)</span></span>
              <div className="sess-wrap">
                {SESSIONS.map((s) => (
                  <label className="sess" key={s.k} style={{ '--c': s.color }}>
                    <input type="radio" name="session" value={s.k} checked={sessionVal === s.k}
                      onChange={() => { set('session', s.k); touch('session'); }} />
                    <div>
                      <b>{s.k}</b>
                      <small>{s.vol}</small>
                      <div className="bars">{[1, 2, 3, 4].map((i) => <i key={i} className={i <= s.lv ? 'on' : ''} />)}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Prices &amp; size</h3>
          <div className="row c3">
            <div>
              <label className="lbl" htmlFor="f-entry">Entry price</label>
              <input id="f-entry" type="number" step="any" inputMode="decimal" placeholder="0.00" value={f.entry} onChange={(ev) => set('entry', ev.target.value)} />
            </div>
            <div>
              <label className="lbl" htmlFor="f-sl">Stop loss (SL)</label>
              <input id="f-sl" type="number" step="any" inputMode="decimal" placeholder="0.00" value={f.sl} onChange={(ev) => set('sl', ev.target.value)} />
            </div>
            <div>
              <label className="lbl" htmlFor="f-tp">Take profit (TP)</label>
              <input id="f-tp" type="number" step="any" inputMode="decimal" placeholder="optional" value={f.tp} onChange={(ev) => set('tp', ev.target.value)} />
            </div>
          </div>
          <div className="row c3">
            <div>
              <label className="lbl" htmlFor="f-close">Close price</label>
              <input id="f-close" type="number" step="any" inputMode="decimal" placeholder="0.00" value={f.close} onChange={(ev) => set('close', ev.target.value)} />
            </div>
            <div>
              <label className="lbl" htmlFor="f-size">Position size</label>
              <input id="f-size" type="number" step="any" inputMode="decimal" placeholder="0.10" value={f.size} onChange={(ev) => set('size', ev.target.value)} />
              <div className="hint">{SIZE_HINT[f.market]}</div>
            </div>
            <div>
              <label className="lbl" htmlFor="f-rr">RR ratio</label>
              <input id="f-rr" type="number" step="any" inputMode="decimal" placeholder="auto" value={rrVal}
                onChange={(ev) => { set('rr', ev.target.value); setTouched((t) => ({ ...t, rr: ev.target.value !== '' })); }} />
              <div className="hint">Auto from entry, SL and TP</div>
            </div>
          </div>
          {warns.length > 0 && <div className="warn">{warns.join(' ')}</div>}
        </div>

        <div className="panel">
          <h3>Result</h3>
          <div className="row">
            <div>
              <span className="lbl">Exit</span>
              <Chips name="exit" options={EXITS} value={exitVal} onChange={(v) => { set('exit', v); touch('exit'); }} />
            </div>
          </div>
          <div className="row c2">
            <div>
              <label className="lbl" htmlFor="f-pnl">Profit &amp; loss (USD)</label>
              <input id="f-pnl" type="number" step="any" inputMode="decimal" placeholder="-25.00" value={pnlVal}
                onChange={(ev) => { set('pnl', ev.target.value); setTouched((t) => ({ ...t, pnl: ev.target.value !== '' })); }} />
              <div className="hint">Auto-filled from prices. You can overwrite it with the broker figure.</div>
            </div>
            <div>
              <label className="lbl" htmlFor="f-mood">How did you feel?</label>
              <select id="f-mood" value={f.mood} onChange={(ev) => set('mood', ev.target.value)}>
                {MOODS.map((m) => <option key={m}>{m}</option>)}
              </select>
              <label className="mood-line">
                <input type="checkbox" checked={f.plan} onChange={(ev) => set('plan', ev.target.checked)} /> I followed my plan
              </label>
            </div>
          </div>
          <div className="row">
            <div>
              <label className="lbl" htmlFor="f-notes">Notes</label>
              <textarea id="f-notes" maxLength={2000} placeholder="Why did you take it? What would you change?" value={f.notes} onChange={(ev) => set('notes', ev.target.value)} />
              <div className="hint">Notes, mood, "followed my plan" and take profit are kept in this browser only.</div>
            </div>
          </div>
        </div>

        {err && <p className="err" role="alert">{err}</p>}
        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving...' : trade ? 'Save changes' : 'Save trade'}</button>
          {trade
            ? <button className="btn" type="button" onClick={onCancel}>Cancel</button>
            : <button className="btn" type="button" onClick={clearForm}>Clear form</button>}
        </div>
      </div>

      <aside>
        <div className="panel clock">
          <h3>Session clock</h3>
          <div className="sub">Where your trade time sits across the day (IST)</div>
          <SessionClock mins={det.mins} active={det.active} />
        </div>
        <div className="panel">
          <h3>This trade</h3>
          <div className="sumbox">
            <div><span>Risk (USD)</span><b>{risk != null ? money(risk, false) : '–'}</b></div>
            <div><span>Planned RR</span><b>{numOrNull(rrVal) != null ? '1 : ' + numOrNull(rrVal).toFixed(2) : '–'}</b></div>
            <div><span>Result in R</span><b className={rMult == null ? '' : rMult >= 0 ? 'pos' : 'neg'}>{rMult != null ? (rMult > 0 ? '+' : '') + rMult.toFixed(2) + ' R' : '–'}</b></div>
            <div><span>P&amp;L</span><b className={pnlNum == null ? '' : pnlNum >= 0 ? 'pos' : 'neg'}>{pnlNum != null ? money(pnlNum) : '–'}</b></div>
          </div>
        </div>
      </aside>
    </form>
  );
}
