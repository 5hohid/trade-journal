import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { PALETTE, SESSIONS } from '../constants.js';
import { prefs } from '../storage.js';
import { downloadExcel } from '../excel.js';
import {
  fmtShortDate, groupCount, groupSum, inPeriod, money, periodTitle, stratName, summarize, tfName, todayIST
} from '../utils.js';

const tipStyle = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)' };
const pieLabel = ({ percent }) => (percent >= 0.06 ? `${Math.round(percent * 100)}%` : '');

function PieBox({ title, sub, data, format }) {
  return (
    <div className="chart-box">
      <h3>{title}</h3>
      <p>{sub}</p>
      <div className="cv">
        {data.length === 0 ? <div className="empty">Nothing to show</div> : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius="68%" label={pieLabel} labelLine={false} isAnimationActive={false}>
                {data.map((d, i) => <Cell key={d.name} fill={d.color || PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip contentStyle={tipStyle} itemStyle={{ color: 'var(--ink)' }} formatter={(v, n) => [format ? format(v) : v + ' trades', n]} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

const toData = (obj) => Object.entries(obj).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

export default function Reports({ trades, tag, notify }) {
  const saved = prefs.get().report || {};
  const [period, setPeriod] = useState(saved.period || 'month');
  const [anchor, setAnchor] = useState(todayIST());

  const changePeriod = (p) => { setPeriod(p); prefs.patch({ report: { period: p } }); };

  const list = useMemo(
    () => trades.filter((t) => inPeriod(t.dt, period, anchor)).sort((a, b) => new Date(a.dt) - new Date(b.dt)),
    [trades, period, anchor]
  );
  const st = useMemo(() => summarize(list), [list]);

  const strat = useMemo(() => toData(groupCount(list, stratName)), [list]);
  const tf = useMemo(() => toData(groupCount(list, tfName)).map((d, i) => ({ ...d, color: PALETTE[(i + 4) % PALETTE.length] })), [list]);
  const sessCounts = groupCount(list, (t) => t.session);
  const sess = SESSIONS.filter((s) => sessCounts[s.k]).map((s) => ({ name: s.k, value: sessCounts[s.k], color: s.color }));
  const pnl = [
    { name: 'Profit', value: +st.gp.toFixed(2), color: '#16895A' },
    { name: 'Loss', value: +st.gl.toFixed(2), color: '#C23A3A' }
  ].filter((d) => d.value > 0);

  const byStrat = Object.entries(groupSum(list, stratName))
    .map(([name, value]) => ({ name, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value);
  let run = 0;
  const equity = list.map((t) => ({ label: fmtShortDate(t.dt), value: +(run += t.pnl).toFixed(2) }));

  const download = () => {
    if (!list.length) { notify('No trades in this period'); return; }
    downloadExcel(list, `trade-report-${tag}-${period}-${anchor}`);
  };

  return (
    <section>
      <div className="page-head">
        <div><h2>Reports</h2><p>See what's working by strategy, time frame, session and profit.</p></div>
        <div className="no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" type="button" onClick={() => window.print()}>Download report (PDF)</button>
          <button className="btn gold" type="button" onClick={download}>Download Excel</button>
        </div>
      </div>

      <div className="rbar no-print">
        <div className="seg-btn">
          {[['week', 'Weekly'], ['month', 'Monthly'], ['year', 'Yearly']].map(([p, label]) => (
            <button key={p} type="button" aria-pressed={period === p} onClick={() => changePeriod(p)}>{label}</button>
          ))}
        </div>
        <div>
          <label className="lbl" htmlFor="anchor">Any date in the period</label>
          <input id="anchor" type="date" style={{ width: 180 }} value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} />
        </div>
      </div>

      <div className="period-title" style={{ marginBottom: 12 }}>{periodTitle(period, anchor)}</div>

      <div className="score">
        <div className="big"><small>Net P&amp;L</small><b className={st.net >= 0 ? 'pos' : 'neg'}>{money(st.net)}</b></div>
        <div><small>Trades</small><b>{st.n}</b><small>{Math.round(st.winRate * 100)}% win rate</small></div>
        <div><small>Profit factor</small><b>{st.pf != null ? st.pf.toFixed(2) : '–'}</b><small>Avg R {st.avgR.toFixed(2)}</small></div>
        <div><small>Avg win / avg loss</small><b>{money(st.avgWin, false)} / {money(st.avgLoss, false)}</b></div>
        <div>
          <small>Best / worst</small>
          <b><span className="pos">{money(st.best)}</span> / <span className="neg">{money(st.worst)}</span></b>
          <small>{st.plan != null ? `${Math.round(st.plan * 100)}% followed plan` : 'plan not logged'}</small>
        </div>
      </div>

      {!list.length ? (
        <div className="empty panel">No trades in this period. Pick another date or add a trade.</div>
      ) : (
        <>
          <div className="charts4">
            <PieBox title="Strategy" sub="Share of trades" data={strat} />
            <PieBox title="Time frame" sub="Share of trades" data={tf} />
            <PieBox title="Session" sub="Share of trades" data={sess} />
            <PieBox title="Profit & loss" sub="Money won vs money lost (USD)" data={pnl} format={(v) => money(v, false)} />
          </div>
          <div className="charts2">
            <div className="chart-box">
              <h3>Net P&amp;L by strategy</h3><p>Which setups earn money</p>
              <div className="cv" style={{ height: Math.max(260, byStrat.length * 36) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byStrat} layout="vertical" margin={{ left: 4, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={118} />
                    <Tooltip contentStyle={tipStyle} formatter={(v) => [money(v), 'Net P&L']} />
                    <Bar dataKey="value" isAnimationActive={false}>
                      {byStrat.map((d) => <Cell key={d.name} fill={d.value >= 0 ? '#16895A' : '#C23A3A'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="chart-box">
              <h3>Equity curve</h3><p>Running P&amp;L through the period</p>
              <div className="cv">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equity} margin={{ left: 0, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" minTickGap={28} />
                    <YAxis width={56} />
                    <Tooltip contentStyle={tipStyle} formatter={(v) => [money(v), 'Total']} />
                    <Line type="monotone" dataKey="value" stroke="#B8860B" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
