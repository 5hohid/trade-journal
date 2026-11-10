const BASE = import.meta.env.VITE_API_URL || '';
let token = null;
try { token = localStorage.getItem('tj_token'); } catch { /* ignore */ }
let onUnauthorized = () => {};

export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };
export const hasToken = () => !!token;
export function setToken(t) {
  token = t;
  try { t ? localStorage.setItem('tj_token', t) : localStorage.removeItem('tj_token'); } catch { /* ignore */ }
}

async function req(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error('Cannot reach the server. Check your internet and try again.');
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    if (res.status === 401 && token) onUnauthorized();
    throw err;
  }
  return data;
}

const q = (uid) => (uid ? `?userId=${uid}` : '');

export const api = {
  register: (b) => req('/auth/register', { method: 'POST', body: b }),
  login: (b) => req('/auth/login', { method: 'POST', body: b }),
  forgot: (username) => req('/auth/forgot', { method: 'POST', body: { username } }),
  reset: (b) => req('/auth/reset', { method: 'POST', body: b }),
  me: () => req('/auth/me'),
  list: (uid) => req('/trades' + q(uid)),
  create: (b, uid) => req('/trades' + q(uid), { method: 'POST', body: b }),
  update: (id, b, uid) => req(`/trades/${id}` + q(uid), { method: 'PUT', body: b }),
  remove: (id, uid) => req(`/trades/${id}` + q(uid), { method: 'DELETE' }),
  bulk: (trades, uid) => req('/trades/bulk' + q(uid), { method: 'POST', body: { trades } }),
  adminUsers: () => req('/admin/users'),
  adminTrades: () => req('/admin/trades'),
  adminPatch: (id, b) => req(`/admin/users/${id}`, { method: 'PATCH', body: b }),
  adminDelete: (id) => req(`/admin/users/${id}`, { method: 'DELETE' })
};
