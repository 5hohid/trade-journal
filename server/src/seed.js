// Creates an admin (if missing) and a demo account with ~150 sample trades:  npm run seed
// Demo login: demo / demo1234   (forgot-password answer: demo)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const User = require('./models/User');
const Trade = require('./models/Trade');
const { MULT } = require('./constants');

const IST = 330;
const SESS = [
  { k: 'Sydney', rng: [[210, 750]] },
  { k: 'Tokyo', rng: [[360, 900]] },
  { k: 'London', rng: [[750, 1290]] },
  { k: 'New York', rng: [[1110, 1440], [0, 210]] }
];
const sessionAt = (m) => SESS.filter((s) => s.rng.some(([a, b]) => m >= a && m < b)).pop().k;

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pad = (n) => String(n).padStart(2, '0');

async function main() {
  await connectDB();
  const adminName = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
  if (!(await User.findOne({ username: adminName }))) {
    await User.create({ username: adminName, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10), role: 'admin' });
    console.log(`Created admin "${adminName}"`);
  }
  await User.deleteOne({ username: 'demo' });
  const user = await User.create({
    username: 'demo', passwordHash: await bcrypt.hash('demo1234', 10),
    securityQuestion: "What is your mother's first name?", securityAnswerHash: await bcrypt.hash('demo', 10)
  });
  await Trade.deleteMany({ user: user._id });

  const r = rng(2026);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const weights = [['Fibonacci retracement', .2], ['Supply & demand', .18], ['Breakouts', .15], ['Liquidity', .14], ['AMD', .1], ['RSI divergence', .08], ['Supertrend', .07], ['Fixed volume', .05], ['Others', .03]];
  const pickStrategy = () => { let x = r(), c = 0; for (const [k, w] of weights) { c += w; if (x < c) return k; } return 'Breakouts'; };
  const markets = [['XAUUSD', .4], ['XAGUSD', .15], ['BTC', .2], ['ETH', .12], ['SOL', .13]];
  const pickMarket = () => { let x = r(), c = 0; for (const [k, w] of markets) { c += w; if (x < c) return k; } return 'XAUUSD'; };
  const BASE = { XAUUSD: 4180, XAGUSD: 52, BTC: 96000, ETH: 3250, SOL: 170 };

  const docs = [];
  for (let d = new Date(Date.UTC(2026, 0, 5)); d <= new Date(Date.UTC(2026, 10, 7)); d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    const count = r() < .25 ? 0 : 1 + Math.floor(r() * 2.2);
    for (let i = 0; i < count; i++) {
      const hr = r() < .7 ? 12 + Math.floor(r() * 14) : Math.floor(r() * 24);
      const hh = hr % 24, mm = Math.floor(r() * 60);
      const dt = new Date(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(hh)}:${pad(mm)}:00+05:30`);
      const market = pickMarket();
      const base = BASE[market] * (1 + (r() - .5) * .06);
      const dist = { XAUUSD: 5 + r() * 10, XAGUSD: .15 + r() * .25, BTC: 400 + r() * 800, ETH: 18 + r() * 30, SOL: 2 + r() * 4 }[market];
      const size = {
        XAUUSD: +(0.1 + Math.floor(r() * 5) * 0.1).toFixed(2), XAGUSD: +(0.1 + Math.floor(r() * 3) * 0.1).toFixed(2),
        BTC: +(0.02 + Math.floor(r() * 5) * 0.01).toFixed(2), ETH: +(0.5 + Math.floor(r() * 6) * .25).toFixed(2),
        SOL: +(2 + Math.floor(r() * 9)).toFixed(0) * 1
      }[market];
      const direction = r() < .55 ? 'Buy' : 'Sell';
      const sg = direction === 'Buy' ? 1 : -1;
      const rrPlan = +(1 + Math.floor(r() * 5) * .5).toFixed(2);
      const dp = market === 'XAGUSD' ? 3 : 2;
      const entry = +base.toFixed(dp);
      const sl = +(entry - sg * dist).toFixed(dp);
      const tp = +(entry + sg * dist * rrPlan).toFixed(dp);
      const o = r();
      let exit, close;
      if (o < .40) { exit = 'Take Profit'; close = tp; }
      else if (o < .78) { exit = 'Stop Loss'; close = sl; }
      else { exit = 'Manual'; close = +(entry + sg * dist * (r() * 2.2 - 1)).toFixed(dp); }
      const pnl = +((close - entry) * sg * size * MULT[market]).toFixed(2);
      const strategy = pickStrategy();
      docs.push({
        user: user._id, dt, market, direction, strategy,
        strategyOther: strategy === 'Others' ? 'News spike' : '',
        timeFrame: pick(['1M', '3M', '5M', '5M', '15M', '15M', '30M', '1H', '4H']),
        session: sessionAt(((hh * 60 + mm) % 1440 + 1440) % 1440),
        entry, sl, close, exit, size, rr: rrPlan, pnl
      });
    }
  }
  await Trade.insertMany(docs);
  console.log(`Created demo user (demo / demo1234) with ${docs.length} trades`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
