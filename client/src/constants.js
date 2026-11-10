export const MARKETS = [
  { k: 'XAUUSD', label: 'XAUUSD (Gold)' },
  { k: 'XAGUSD', label: 'XAGUSD (Silver)' },
  { k: 'BTC', label: 'BTC' },
  { k: 'ETH', label: 'Ethereum' },
  { k: 'SOL', label: 'Solana' }
];
export const MARKET_LABEL = Object.fromEntries(MARKETS.map((m) => [m.k, m.label]));
// How much money 1.00 of price movement is worth for 1 lot (crypto: 1 unit)
export const MULT = { XAUUSD: 100, XAGUSD: 5000, BTC: 1, ETH: 1, SOL: 1 };
export const SIZE_HINT = {
  XAUUSD: 'Lots (1 lot = 100 oz)',
  XAGUSD: 'Lots (1 lot = 5,000 oz)',
  BTC: 'Units of BTC',
  ETH: 'Units of ETH',
  SOL: 'Units of SOL'
};

export const STRATEGIES = [
  'Fibonacci retracement', 'Fixed volume', 'Supply & demand', 'AMD', 'Breakouts',
  'RSI divergence', 'Liquidity', 'Supertrend', 'Others'
];
export const TFS = ['1M', '3M', '5M', '15M', '30M', '1H', '4H', 'Other'];

// Session times in IST minutes of the day (from the trader's session chart)
export const SESSIONS = [
  { k: 'Sydney', vol: 'Low to medium', lv: 1, color: '#2E9E57', rng: [[210, 750]] },
  { k: 'Tokyo', vol: 'Medium', lv: 2, color: '#2F7FD6', rng: [[360, 900]] },
  { k: 'London', vol: 'High', lv: 3, color: '#7A45D1', rng: [[750, 1290]] },
  { k: 'New York', vol: 'Very high', lv: 4, color: '#D13C3C', rng: [[1110, 1440], [0, 210]] }
];
export const SESSION_COLOR = Object.fromEntries(SESSIONS.map((s) => [s.k, s.color]));

export const EXITS = ['Take Profit', 'Stop Loss', 'Manual', 'Other'];
export const MOODS = ['Calm', 'Confident', 'Anxious', 'FOMO', 'Revenge trade', 'Bored'];
export const QUESTIONS = [
  "What is your mother's first name?",
  'What was your first school called?',
  'What is the name of your childhood best friend?',
  'In which town were you born?',
  'What was your first phone model?'
];
export const PALETTE = ['#2F7FD6', '#E0A21B', '#2E9E57', '#D13C3C', '#7A45D1', '#17A2B8', '#E8743B', '#8A9BA8', '#C2438F'];
