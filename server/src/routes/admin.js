const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Trade = require('../models/Trade');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth, auth.adminOnly);

// All users with their trade count and last trade date
router.get('/users', async (req, res, next) => {
  try {
    const [users, stats] = await Promise.all([
      User.find().sort({ createdAt: 1 }).lean(),
      Trade.aggregate([{ $group: { _id: '$user', count: { $sum: 1 }, last: { $max: '$dt' } } }])
    ]);
    const byUser = Object.fromEntries(stats.map((s) => [s._id.toString(), s]));
    res.json(users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      role: u.role,
      disabled: !!u.disabled,
      createdAt: u.createdAt,
      trades: byUser[u._id.toString()]?.count || 0,
      lastTrade: byUser[u._id.toString()]?.last || null
    })));
  } catch (e) { next(e); }
});

// Every trade of every user (for "Download Excel - all users")
router.get('/trades', async (req, res, next) => {
  try {
    const [users, trades] = await Promise.all([
      User.find().select('username').lean(),
      Trade.find().sort({ dt: -1 }).limit(50000).lean()
    ]);
    const names = Object.fromEntries(users.map((u) => [u._id.toString(), u.username]));
    res.json(trades.map((t) => ({ ...t, username: names[t.user.toString()] || '?' })));
  } catch (e) { next(e); }
});

// Disable/enable a user or reset a password
router.patch('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { disabled, newPassword } = req.body || {};
    if (typeof disabled === 'boolean') {
      if (user._id.toString() === req.user.id) return res.status(400).json({ error: 'You cannot disable your own account' });
      user.disabled = disabled;
    }
    if (newPassword !== undefined) {
      if (typeof newPassword !== 'string' || newPassword.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    await user.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Delete a user and all their trades
router.delete('/users/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await Trade.deleteMany({ user: user._id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
