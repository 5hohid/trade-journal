module.exports = {
  MARKETS: ['XAUUSD', 'XAGUSD', 'BTC', 'ETH', 'SOL'],
  DIRECTIONS: ['Buy', 'Sell'],
  STRATEGIES: [
    'Fibonacci retracement', 'Fixed volume', 'Supply & demand', 'AMD', 'Breakouts',
    'RSI divergence', 'Liquidity', 'Supertrend', 'Others'
  ],
  TIMEFRAMES: ['1M', '3M', '5M', '15M', '30M', '1H', '4H', 'Other'],
  SESSIONS: ['Sydney', 'Tokyo', 'London', 'New York'],
  EXITS: ['Take Profit', 'Stop Loss', 'Manual', 'Other'],
  ROLES: ['user', 'admin'],
  SECURITY_QUESTIONS: [
    "What is your mother's first name?",
    'What was your first school called?',
    'What is the name of your childhood best friend?',
    'In which town were you born?',
    'What was your first phone model?'
  ],
  // contract size: units moved per 1.00 price change for 1 lot (crypto: 1 unit)
  MULT: { XAUUSD: 100, XAGUSD: 5000, BTC: 1, ETH: 1, SOL: 1 }
};
