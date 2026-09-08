const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');

let io = null;

/** Every authenticated user's sockets join a private room keyed by their own id. */
function userRoom(userId) {
  return `user:${userId.toString()}`;
}

function initSockets(httpServer, corsOrigins) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
  });

  // Auth handshake: token must be valid or the connection is rejected outright.
  // This is what prevents one user's activity from ever reaching another
  // user's socket - sockets are only ever placed in their OWN user room.
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

    socket.on('disconnect', () => {
      // socket.io automatically leaves all rooms on disconnect; nothing else to clean up.
    });
  });

  return io;
}

/** Broadcasts an event to every session (web + Expo + other devices) belonging to one user. */
function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
}

module.exports = { initSockets, emitToUser };
