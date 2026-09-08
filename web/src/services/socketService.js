import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

/** Opens an authenticated socket connection for the current user. Call on login. */
function connectSocket(token) {
  if (socket) socket.disconnect();

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
  });

  return socket;
}

/** Tears down the socket. Call on logout so the next guest never sees the previous user's events. */
function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

function getSocket() {
  return socket;
}

export const socketService = { connectSocket, disconnectSocket, getSocket };
