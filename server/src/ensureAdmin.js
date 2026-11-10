const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Creates the first admin from ADMIN_USERNAME / ADMIN_PASSWORD (runs once per server start).
let done = null;
module.exports = function ensureAdmin() {
  if (!done) {
    done = (async () => {
      const name = (process.env.ADMIN_USERNAME || '').toLowerCase().trim();
      const pass = process.env.ADMIN_PASSWORD || '';
      if (!name || pass.length < 6) return;
      const existing = await User.findOne({ username: name });
      if (!existing) {
        await User.create({ username: name, passwordHash: await bcrypt.hash(pass, 10), role: 'admin' });
        console.log(`Admin account "${name}" created`);
      } else if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
      }
    })().catch((e) => { done = null; console.error('ensureAdmin failed:', e.message); });
  }
  return done;
};
