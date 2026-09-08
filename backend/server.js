require('dotenv').config();
const http = require('http');
const createApp = require('./app');
const connectDB = require('./config/db');
const { initSockets } = require('./sockets');

async function start() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  const corsOrigins = (process.env.CORS_ORIGINS || '*').split(',').map((o) => o.trim());
  initSockets(server, corsOrigins);

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    console.log(`[server] Listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});