const express = require('express');
const Trade = require('../models/Trade');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const FIELDS = [
  'dt', 'market', 'direction', 'strategy', 'strategyOther', 'timeFrame', 'timeFrameOther', 'session',
  'entry', 'sl', 'close', 'exit', 'size', 'rr', 'pnl'
];
// Only allow known fields (nobody can set `user` or `_id` themselves)
const pick = (body = {}) => {
  const out = {};
  FIELDS.forEach((k) => { if (body[k] !== undefined) out[k] = body[k]; });
  return out;
};
// Normal users always work on their own trades. An admin may add ?userId=... to work on someone else's.
const owner = (req) => (req.user.role === 'admin' && req.query.userId ? req.query.userId : req.user.id);

router.get('/', async (req, res, next) => {
  try {
    res.json(await Trade.find({ user: owner(req) }).sort({ dt: -1 }).limit(20000).lean());
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    res.status(201).json(await Trade.create({ ...pick(req.body), user: owner(req) }));
  } catch (e) { next(e); }
});

// Add many (used by "Restore from Excel"). Returns the new ids so the browser can re-attach notes etc.
router.post('/bulk', async (req, res, next) => {
  try {
    const list = Array.isArray(req.body?.trades) ? req.body.trades : [];
    if (!list.length) return res.status(400).json({ error: 'No trades sent' });
    if (list.length > 5000) return res.status(400).json({ error: 'Too many trades in one upload (max 5000)' });
    const user = owner(req);
    const docs = [];
    const idx = [];
    list.forEach((raw, i) => {
      const doc = new Trade({ ...pick(raw), user });
      if (!doc.validateSync()) { docs.push(doc); idx.push(i); }
    });
    if (docs.length) await Trade.insertMany(docs);
    res.status(201).json({
      inserted: docs.length,
      skipped: list.length - docs.length,
      ids: docs.map((d, k) => ({ i: idx[k], id: d._id.toString() }))
    });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const trade = await Trade.findOneAndUpdate({ _id: req.params.id, user: owner(req) }, pick(req.body), {
      new: true,
      runValidators: true
    });
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    res.json(trade);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const trade = await Trade.findOneAndDelete({ _id: req.params.id, user: owner(req) });
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
