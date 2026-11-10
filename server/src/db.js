const mongoose = require('mongoose');

// Cached connection so it also works on serverless platforms.
const cache = global._tjMongoose || (global._tjMongoose = { conn: null, promise: null });

async function connectDB() {
  if (cache.conn) return cache.conn;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
      .catch((err) => { cache.promise = null; throw err; });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

module.exports = connectDB;
