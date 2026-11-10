const app = require('./app');
const connectDB = require('./db');
const ensureAdmin = require('./ensureAdmin');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(ensureAdmin)
  .then(() => app.listen(PORT, () => console.log(`API running on port ${PORT}`)))
  .catch((err) => {
    console.error('Could not start:', err.message);
    process.exit(1);
  });
