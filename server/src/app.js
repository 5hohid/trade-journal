require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const ensureAdmin = require('./ensureAdmin');

const app = express();

const origins = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json({ limit: '2mb' }));

// Health check (does not need the database) - handy for a free uptime pinger
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Make sure the database is connected (and the admin exists) before any other route
app.use('/api', async (req, res, next) => {
  try { await connectDB(); await ensureAdmin(); next(); } catch (e) { next(e); }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/trades', require('./routes/trades'));
app.use('/api/admin', require('./routes/admin'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid value for ' + err.path });
  console.error(err);
  res.status(500).json({ error: 'Server error. Please try again.' });
});

module.exports = app;
