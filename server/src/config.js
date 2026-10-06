import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5001,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/watch-party',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
  defaultVideoId: 'M7lc1UVf-VE',
  reconnectGraceMs: 8000,
  maxChatHistory: 100,
  maxPendingPerUser: 5,
  reactionCooldownMs: 250
};
