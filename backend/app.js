const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  const corsOrigins = (process.env.CORS_ORIGINS || '*')
    .split(',')
    .map((o) => o.trim());

  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/users', userRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
