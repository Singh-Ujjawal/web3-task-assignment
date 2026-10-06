import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { config } from './config.js';
import RoomManager from './domain/RoomManager.js';
import authRoutes from './routes/auth.js';
import requireAuth from './middleware/requireAuth.js';
import roomRoutes from './routes/rooms.js';
import { verifyToken } from './utils/tokens.js';
import MessageHandler from './socket/MessageHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

const origin = config.clientOrigin === '*' ? true : config.clientOrigin.split(',');

const app = express();
app.use(cors({ origin }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin } });
const manager = new RoomManager(io);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes());
app.use('/api/rooms', requireAuth, roomRoutes(manager));

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

io.use((socket, next) => {
  try {
    socket.data.user = verifyToken(socket.handshake.auth && socket.handshake.auth.token);
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  new MessageHandler(socket, manager).register();
});

async function start() {
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected');
  server.listen(config.port, () => console.log(`Server listening on ${config.port}`));
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
