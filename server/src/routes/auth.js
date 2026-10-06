import bcrypt from 'bcryptjs';
import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import UserModel from '../models/UserModel.js';
import { signToken } from '../utils/tokens.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

export default function authRoutes() {
  const router = Router();

  router.post('/register', async (req, res) => {
    const { name, email, password } = req.body || {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!cleanName || cleanName.length > 24) {
      return res.status(400).json({ error: 'Name must be 1-24 characters' });
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      return res.status(400).json({ error: 'Enter a valid email' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
      if (await UserModel.exists({ email: cleanEmail })) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await UserModel.create({ name: cleanName, email: cleanEmail, passwordHash });
      res.status(201).json({ token: signToken(user), user: publicUser(user) });
    } catch (err) {
      console.error('Register failed', err);
      res.status(500).json({ error: 'Could not create account' });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
      const user = await UserModel.findOne({ email: email.trim().toLowerCase() });
      const valid = user && (await bcrypt.compare(password, user.passwordHash));
      if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
      res.json({ token: signToken(user), user: publicUser(user) });
    } catch (err) {
      console.error('Login failed', err);
      res.status(500).json({ error: 'Could not log in' });
    }
  });

  router.get('/me', requireAuth, async (req, res) => {
    const user = await UserModel.findById(req.user.id).catch(() => null);
    if (!user) return res.status(401).json({ error: 'Account not found' });
    res.json({ user: publicUser(user) });
  });

  return router;
}
