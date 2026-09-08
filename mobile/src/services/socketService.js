import { io } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://10.0.2.2:5000';

let socket = null;

function connectSocket(token) {
  if (socket) socket.disconnect();
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
  });
  return socket;
}

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
