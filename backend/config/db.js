const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce';

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri);
    console.log(`[db] MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error('[db] MongoDB connection error:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });
}

module.exports = connectDB;
