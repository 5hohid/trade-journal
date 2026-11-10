import { useMemo, useRef, useState } from 'react';
import { MARKETS, MARKET_LABEL, SESSION_COLOR } from '../constants.js';
import { prefs } from '../storage.js';
import { downloadExcel } from '../excel.js';
import { fmtDT, money, stratName, tfName } from '../utils.js';

export default function Journal({ trades, tag, onEdit, onDelete, onImport, notify }) {
  const saved = prefs.get().journal || {};
  const [flt, setFlt] = useState({ market: '', strategy: '', direction: '', result: '', ...saved });
  const fileRef = useRef(null);

  const set = (k, v) => {
    const next = { ...flt, [k]: v };
    setFlt(next);
    prefs.patch({ journal: next });
  };

  const strategies = useMemo(() => [...new Set(trades.map(stratName))].sort(), [trades]);
  const list = useMemo(
    () => trades
      .filter((t) =>
        (!flt.market || t.market === flt.market) &&
        (!flt.strategy || stratName(t) === flt.strategy) &&
        (!flt.direction || t.direction === flt.direction) &&
        (!flt.result || (flt.result === 'w' ? t.pnl > 0 : t.pnl <= 0)))
      .sort((a, b) => new Date(b.dt) - new Date(a.dt)),
    [trades, flt]
  );
  const net = list.reduce((a, t) => a + t.pnl, 0);

  const download = () => {
    if (!trades.length) { notify('No trades to download'); return; }
    downloadExcel(trades, `trade-journal-${tag}`);
  };
  const pickFile = (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (file) onImport(file);
  };

  return (
    <section>
      <div className="page-head">
        <div><h2>Journal</h2><p>{list.length} trades · net {money(net)}</p></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" type="button" onClick={() => fileRef.current.click()}>Restore from Excel</button>
          <input ref={fileRef} className="file-hidden" type="file" accept=".xlsx,.xls" onChange={pickFile} />
          <button className="btn gold" type="button" onClick={download}>Download Excel</button>
        </div>
      </div>

      <div className="filters">
        <select aria-label="Filter by market" value={flt.market} onChange={(e) => set('market', e.target.value)}>
          <option value="">All markets</option>
          {MARKETS.map((m) => <option key={m.k} value={m.k}>{m.label}</option>)}
        </select>
        <select aria-label="Filter by strategy" value={flt.strategy} onChange={(e) => set('strategy', e.target.value)}>
          <option value="">All strategies</option>
          {strategies.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Filter by direction" value={flt.direction} onChange={(e) => set('direction', e.target.value)}>
          <option value="">Buy &amp; Sell</option><option>Buy</option><option>Sell</option>
        </select>
        <select aria-label="Filter by result" value={flt.result} onChange={(e) => set('result', e.target.value)}>
          <option value="">Wins &amp; losses</option><option value="w">Wins</option><option value="l">Losses</option>
        </select>
      </div>

      {!list.length && <div className="empty panel">No trades yet. Add your first trade from the "Add trade" tab.</div>}

      {list.length > 0 && (
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Date &amp; time</th><th>Market</th><th>Side</th><th>Strategy</th><th>TF</th><th>Session</th>
                <th className="n">Entry</th><th className="n">SL</th><th className="n">Close</th><th>Exit</th>
                <th className="n">Size</th><th className="n">RR</th><th className="n">P&amp;L (USD)</th><th />
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t._id}>
                  <td>{fmtDT(t.dt)}</td>
                  <td>{t.market}</td>
                  <td><span className={'badge ' + (t.direction === 'Buy' ? 'buy' : 'sell')}>{t.direction}</span></td>
                  <td>{stratName(t)}</td>
                  <td>{tfName(t)}</td>
                  <td><span className="dot" style={{ '--c': SESSION_COLOR[t.session] }} />{t.session}</td>
                  <td className="n">{t.entry}</td><td className="n">{t.sl}</td><td className="n">{t.close}</td>
                  <td>{t.exit}</td>
                  <td className="n">{t.size}</td>
                  <td className="n">{t.rr != null ? Number(t.rr).toFixed(2) : '–'}</td>
                  <td className={'n ' + (t.pnl >= 0 ? 'pos' : 'neg')}><b>{money(t.pnl)}</b></td>
                  <td>
                    <div className="acts" style={{ display: 'flex', gap: 6 }}>
                      <button className="btn small" type="button" onClick={() => onEdit(t)}>Edit</button>
                      <button className="btn small ghost" type="button" onClick={() => onDelete(t)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* phone layout */}
      <div className="cards">
        {list.map((t) => (
          <div className="tcard" key={t._id}>
            <div className="top">
              <span><span className={'badge ' + (t.direction === 'Buy' ? 'buy' : 'sell')}>{t.direction}</span> <b>{MARKET_LABEL[t.market]}</b></span>
              <span className={'pnl ' + (t.pnl >= 0 ? 'pos' : 'neg')}>{money(t.pnl)}</span>
            </div>
            <div className="sub">{fmtDT(t.dt)} · <span className="dot" style={{ '--c': SESSION_COLOR[t.session] }} />{t.session}</div>
            <div className="mid"><span>{stratName(t)} · {tfName(t)}</span><span className="sub">{t.exit}</span></div>
            <div className="sub">Entry {t.entry} · SL {t.sl} · Close {t.close} · Size {t.size}{t.rr != null ? ` · RR ${Number(t.rr).toFixed(2)}` : ''}</div>
            {t.notes && <div className="sub">“{t.notes}”</div>}
            <div className="bot">
              <span />
              <div className="acts">
                <button className="btn small" type="button" onClick={() => onEdit(t)}>Edit</button>
                <button className="btn small ghost" type="button" onClick={() => onDelete(t)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
