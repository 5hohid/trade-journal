const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Checks the login token, then loads the user so role/disabled changes apply immediately.
async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
  try {
    const user = await User.findById(payload.id).select('username role disabled');
    if (!user) return res.status(401).json({ error: 'Account not found' });
    if (user.disabled) return res.status(403).json({ error: 'This account is disabled. Contact the admin.' });
    req.user = { id: user._id.toString(), username: user.username, role: user.role };
    next();
  } catch (e) { next(e); }
}

function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ error: 'Admin only' });
}

module.exports = auth;
module.exports.adminOnly = adminOnly;
