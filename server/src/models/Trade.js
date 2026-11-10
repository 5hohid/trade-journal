const mongoose = require('mongoose');
const C = require('../constants');

const num = { type: Number, required: true };

const tradeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dt: { type: Date, required: true },
    market: { type: String, enum: C.MARKETS, required: true },
    direction: { type: String, enum: C.DIRECTIONS, required: true },
    strategy: { type: String, enum: C.STRATEGIES, required: true },
    strategyOther: { type: String, trim: true, maxlength: 60, default: '' },
    timeFrame: { type: String, enum: C.TIMEFRAMES, required: true },
    timeFrameOther: { type: String, trim: true, maxlength: 20, default: '' },
    session: { type: String, enum: C.SESSIONS, required: true },
    entry: num,
    sl: num,
    close: num,
    exit: { type: String, enum: C.EXITS, required: true },
    size: { type: Number, required: true, min: 0 },
    rr: { type: Number, default: null },
    pnl: num
  },
  { timestamps: true }
);

tradeSchema.index({ user: 1, dt: -1 });

module.exports = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);
