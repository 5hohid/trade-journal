import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, hasToken, setToken, setUnauthorizedHandler } from './api.js';
import { cache, loadExtras, prefs, saveExtras } from './storage.js';
import { readRows, rowsToTrades, tradeKey } from './excel.js';
import Login from './components/Login.jsx';
import TradeForm from './components/TradeForm.jsx';
import Journal from './components/Journal.jsx';
import Reports from './components/Reports.jsx';
import Admin from './components/Admin.jsx';

const THEMES = ['auto', 'light', 'dark'];

export default function App() {
  const cachedUser = hasToken() ? prefs.get().user || null : null;
  const [user, setUser] = useState(cachedUser);
  const [booting, setBooting] = useState(hasToken() && !cachedUser);
  const [tab, setTab] = useState('add');
  const [raw, setRaw] = useState(() => (cachedUser ? cache.get(cachedUser.id) : []));
  const [extras, setExtras] = useState(loadExtras);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null); // admin looking at another user's account
  const [toast, setToast] = useState('');
  const [theme, setTheme] = useState(prefs.get().theme || 'auto');
  const keyRef = useRef(null); // which account the list on screen belongs to
  const toastTimer = useRef(null);

  const notify = useCallback((m) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }, []);

  /* ----- theme (auto / light / dark) ----- */
  useEffect(() => {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    prefs.patch({ theme });
  }, [theme]);

  /* ----- trades: show the saved copy instantly, then refresh from the server ----- */
  const loadTrades = useCallback(async (viewId, ownId) => {
    const key = viewId || ownId;
    keyRef.current = key;
    setRaw(cache.get(key));
    setLoading(true);
    try {
      const list = await api.list(viewId || undefined);
      if (keyRef.current === key) { setRaw(list); cache.set(key, list); }
    } catch (e) {
      notify(e.message);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const forget = useCallback(() => {
    setToken(null); setUser(null); setViewing(null); setEditing(null); setRaw([]);
    prefs.patch({ user: null });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { forget(); notify('Please log in again'); });
  }, [forget, notify]);

  // On first open: confirm the saved login is still valid
  useEffect(() => {
    if (!hasToken()) return;
    api.me()
      .then((u) => {
        setUser(u); prefs.patch({ user: u });
        loadTrades(null, u.id);
      })
      .catch((e) => { if (e.status === 403) { forget(); notify(e.message); } else if (e.status !== 401) notify(e.message); })
      .finally(() => setBooting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAuth({ token, user: u }) {
    setToken(token);
    setUser(u);
    prefs.patch({ user: u });
    setTab('add');
    loadTrades(null, u.id);
  }

  /* ----- merge the browser-only extras into each trade ----- */
  const trades = useMemo(() => raw.map((t) => {
    const x = extras[t._id] || {};
    return { ...t, tp: x.tp ?? null, mood: x.mood || '', plan: x.plan === undefined ? null : x.plan, notes: x.notes || '' };
  }), [raw, extras]);

  const viewId = viewing ? viewing.id : null;
  const tag = viewing ? viewing.username : user?.username || 'me';

  const commit = (updater) => setRaw((prev) => {
    const next = updater(prev);
    if (keyRef.current) cache.set(keyRef.current, next);
    return next;
  });
  const putExtras = (fn) => setExtras((m) => { const next = fn({ ...m }); saveExtras(next); return next; });

  function onSaved(result, ex, isEdit) {
    putExtras((m) => { m[result._id] = ex; return m; });
    commit((list) => (isEdit ? list.map((t) => (t._id === result._id ? result : t)) : [result, ...list]));
    if (isEdit) { setEditing(null); setTab('journal'); }
    notify(isEdit ? 'Trade updated' : 'Trade saved');
  }

  async function deleteTrade(t) {
    if (!window.confirm('Delete this trade?')) return;
    try {
      await api.remove(t._id, viewId || undefined);
      commit((list) => list.filter((x) => x._id !== t._id));
      putExtras((m) => { delete m[t._id]; return m; });
      notify('Trade deleted');
    } catch (e) { notify(e.message); }
  }

  async function importFile(file) {
    try {
      const { list, bad } = rowsToTrades(await readRows(file));
      if (!list.length) { notify('No valid trades found in that file'); return; }
      const have = new Set(raw.map(tradeKey));
      const fresh = list.filter((x) => !have.has(tradeKey(x.body)));
      if (!fresh.length) { notify('All trades in the file already exist'); return; }
      const res = await api.bulk(fresh.map((x) => x.body), viewId || undefined);
      putExtras((m) => { res.ids.forEach(({ i, id }) => { m[id] = fresh[i].extras; }); return m; });
      await loadTrades(viewId, user.id);
      const skipped = list.length - fresh.length + bad + res.skipped;
      notify(`Added ${res.inserted} trades` + (skipped ? ` (${skipped} skipped)` : ''));
    } catch (e) { notify(e.message); }
  }

  function openUser(u) {
    setViewing({ id: u.id, username: u.username });
    setEditing(null);
    setTab('journal');
    loadTrades(u.id, user.id);
  }
  function backToMe() {
    setViewing(null); setEditing(null);
    loadTrades(null, user.id);
  }

  /* ----- screens ----- */
  if (booting) return <div className="boot"><div><div className="brand dark"><i /> Trade Journal</div><p>Opening... the free server may take up to a minute to wake up.</p></div></div>;
  if (!user) return (<><Login onAuth={handleAuth} />{toast && <div className="toast" role="status">{toast}</div>}</>);

  const tabs = [
    { k: 'add', label: editing ? 'Edit trade' : 'Add trade' },
    { k: 'journal', label: 'Journal' },
    { k: 'reports', label: 'Reports' },
    ...(user.role === 'admin' ? [{ k: 'admin', label: 'Admin' }] : [])
  ];
  const go = (k) => { if (k === 'add' && tab !== 'add') { /* keep editing state */ } setTab(k); };
  const nextTheme = () => setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]);

  return (
    <div>
      <header className="top">
        <div className="top-in">
          <div className="brand"><i /> Trade Journal</div>
          <nav className="tabs" role="tablist">
            {tabs.map((t) => (
              <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => go(t.k)}>{t.label}</button>
            ))}
          </nav>
          <div className="spacer" />
          <div className="who">
            <span className="uname">{user.username}</span>
            {user.role === 'admin' && <span className="role-pill">admin</span>}
            <button className="btn small ghost" type="button" onClick={nextTheme} title="Change theme">Theme: {theme}</button>
            <button className="btn small ghost" type="button" onClick={forget}>Log out</button>
          </div>
        </div>
      </header>

      <main>
        {viewing && (
          <div className="banner">
            <span>Admin view: you are working in <b>{viewing.username}</b>'s account.</span>
            <button className="btn small" type="button" onClick={backToMe}>Back to my account</button>
          </div>
        )}
        {loading && <p className="hint" style={{ marginTop: 0 }}>Updating from the server... it may be waking up.</p>}

        {tab === 'add' && (
          <section>
            <div className="page-head">
              <div>
                <h2>{editing ? 'Edit trade' : 'Add trade'}</h2>
                <p>{editing ? 'Change anything and save.' : 'Fill this in right after you close the position.'}</p>
              </div>
            </div>
            <TradeForm
              key={editing ? editing._id : 'new'}
              trade={editing}
              targetUid={viewId || undefined}
              onSaved={onSaved}
              onCancel={() => { setEditing(null); setTab('journal'); }}
            />
          </section>
        )}
        {tab === 'journal' && (
          <Journal trades={trades} tag={tag} notify={notify} onImport={importFile}
            onEdit={(t) => { setEditing(t); setTab('add'); }} onDelete={deleteTrade} />
        )}
        {tab === 'reports' && <Reports trades={trades} tag={tag} notify={notify} />}
        {tab === 'admin' && user.role === 'admin' && <Admin me={user} onOpen={openUser} notify={notify} />}
      </main>

      <nav className="bottom-nav" role="tablist">
        {tabs.map((t) => (
          <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => go(t.k)}>{t.label}</button>
        ))}
      </nav>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
