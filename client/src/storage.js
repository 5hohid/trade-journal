// Everything that lives only in this browser (never sent to the database).
const get = (k, d) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; }
};
const set = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ }
};

export const prefs = {
  get: () => get('tj_prefs', {}),
  patch: (p) => set('tj_prefs', { ...get('tj_prefs', {}), ...p })
};

// Extra per-trade details kept in the browser: { [tradeId]: { tp, mood, plan, notes } }
export const loadExtras = () => get('tj_extras', {});
export const saveExtras = (map) => set('tj_extras', map);

// Unsaved "Add trade" form
export const draft = {
  get: () => get('tj_draft', null),
  set: (v) => set('tj_draft', v),
  clear: () => { try { localStorage.removeItem('tj_draft'); } catch { /* ignore */ } }
};

// Copy of the trade list so the app opens instantly while a sleeping server wakes up
export const cache = {
  get: (uid) => get('tj_cache_' + uid, []),
  set: (uid, list) => set('tj_cache_' + uid, list)
};
