const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { SECURITY_QUESTIONS } = require('../constants');

const router = express.Router();

function sign(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '30d' });
}
const publicUser = (u) => ({ id: u._id.toString(), username: u.username, role: u.role });
const norm = (s) => String(s || '').trim().toLowerCase();
const okPassword = (p) => typeof p === 'string' && p.length >= 6 && p.length <= 100;

router.post('/register', async (req, res, next) => {
  try {
    if (process.env.ALLOW_REGISTER === 'false') return res.status(403).json({ error: 'Registration is closed' });
    const { username, password, securityQuestion, securityAnswer } = req.body || {};
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_.-]{3,30}$/.test(username))
      return res.status(400).json({ error: 'Username must be 3-30 letters, numbers, dot, dash or underscore' });
    if (!okPassword(password)) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!SECURITY_QUESTIONS.includes(securityQuestion)) return res.status(400).json({ error: 'Choose a security question' });
    if (norm(securityAnswer).length < 2) return res.status(400).json({ error: 'Enter an answer to your security question' });
    const name = username.toLowerCase();
    if (await User.findOne({ username: name })) return res.status(409).json({ error: 'That username is taken' });
    const user = await User.create({
      username: name,
      passwordHash: await bcrypt.hash(password, 10),
      securityQuestion,
      securityAnswerHash: await bcrypt.hash(norm(securityAnswer), 10)
    });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string')
      return res.status(400).json({ error: 'Enter username and password' });
    const user = await User.findOne({ username: norm(username) });
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) return res.status(401).json({ error: 'Wrong username or password' });
    if (user.disabled) return res.status(403).json({ error: 'This account is disabled. Contact the admin.' });
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

// Forgot password, step 1: get the user's security question
router.post('/forgot', async (req, res, next) => {
  try {
    const user = await User.findOne({ username: norm(req.body?.username) });
    if (!user) return res.status(404).json({ error: 'No account with that username' });
    if (!user.securityQuestion) return res.status(400).json({ error: 'This account has no security question. Ask the admin to reset your password.' });
    res.json({ question: user.securityQuestion });
  } catch (e) { next(e); }
});

// Forgot password, step 2: answer the question and choose a new password
router.post('/reset', async (req, res, next) => {
  try {
    const { username, answer, newPassword } = req.body || {};
    if (!okPassword(newPassword)) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const user = await User.findOne({ username: norm(username) });
    const ok = user && user.securityAnswerHash && (await bcrypt.compare(norm(answer), user.securityAnswerHash));
    if (!ok) return res.status(401).json({ error: 'That answer is not correct' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/me', auth, (req, res) => res.json(req.user));

module.exports = router;
