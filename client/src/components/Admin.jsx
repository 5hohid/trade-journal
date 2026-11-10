import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { downloadExcel } from '../excel.js';
import { fmtDT } from '../utils.js';

// Admin only: see every user, open their journal, reset passwords, disable or delete accounts.
export default function Admin({ me, onOpen, notify }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setUsers(await api.adminUsers()); } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run(fn, okMsg) {
    try { await fn(); notify(okMsg); await load(); } catch (e) { notify(e.message); }
  }
  const resetPw = (u) => {
    const pw = window.prompt(`New password for "${u.username}" (at least 6 characters):`);
    if (pw) run(() => api.adminPatch(u.id, { newPassword: pw }), 'Password changed');
  };
  const toggle = (u) => run(() => api.adminPatch(u.id, { disabled: !u.disabled }), u.disabled ? 'Account enabled' : 'Account disabled');
  const remove = (u) => {
    if (window.confirm(`Delete "${u.username}" and ALL their trades? This cannot be undone.`))
      run(() => api.adminDelete(u.id), 'User deleted');
  };
  async function downloadAll() {
    try {
      const all = await api.adminTrades();
      if (!all.length) { notify('No trades yet'); return; }
      downloadExcel(all, 'trade-journal-all-users', true);
    } catch (e) { notify(e.message); }
  }

  const buttons = (u) => (
    <div className="acts">
      <button className="btn small" type="button" onClick={() => onOpen(u)}>Open</button>
      <button className="btn small" type="button" onClick={() => resetPw(u)}>Reset password</button>
      <button className="btn small" type="button" disabled={u.id === me.id} onClick={() => toggle(u)}>{u.disabled ? 'Enable' : 'Disable'}</button>
      <button className="btn small ghost" type="button" disabled={u.id === me.id} onClick={() => remove(u)}>Delete</button>
    </div>
  );

  return (
    <section>
      <div className="page-head">
        <div><h2>Admin</h2><p>{users.length} accounts</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" type="button" onClick={load}>Refresh</button>
          <button className="btn gold" type="button" onClick={downloadAll}>Download Excel (all users)</button>
        </div>
      </div>
      {err && <p className="err">{err}</p>}
      {loading && <p className="hint">Loading users...</p>}

      <div className="tbl-wrap">
        <table className="admin-table" style={{ minWidth: 760 }}>
          <thead><tr><th>Username</th><th>Role</th><th className="n">Trades</th><th>Last trade</th><th>Status</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><b>{u.username}</b></td>
                <td>{u.role}</td>
                <td className="n">{u.trades}</td>
                <td>{u.lastTrade ? fmtDT(u.lastTrade) : '–'}</td>
                <td>{u.disabled ? <span className="pill-off">Disabled</span> : 'Active'}</td>
                <td>{buttons(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cards">
        {users.map((u) => (
          <div className="tcard" key={u.id}>
            <div className="top"><b>{u.username}</b><span className="sub">{u.role}{u.disabled ? ' · disabled' : ''}</span></div>
            <div className="sub">{u.trades} trades · last {u.lastTrade ? fmtDT(u.lastTrade) : '–'}</div>
            {buttons(u)}
          </div>
        ))}
      </div>
    </section>
  );
}
