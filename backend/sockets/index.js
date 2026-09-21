const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');

let io = null;

function userRoom(userId) {
  return `user:${userId.toString()}`;
}

function initSockets(httpServer, corsOrigins) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyToken(token);
      socket.userId = payload.sub;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.userId));
    socket.on('disconnect', () => {});
  });

  return io;
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
}

module.exports = { initSockets, emitToUser };
