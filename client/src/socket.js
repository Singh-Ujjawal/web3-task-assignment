import { io } from 'socket.io-client';
import { serverUrl } from './api.js';
import { getToken } from './utils/token.js';

const socket = io(serverUrl || undefined, {
  autoConnect: false,
  auth: (callback) => callback({ token: getToken() })
});

export default socket;
