import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, name: user.name }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

export function verifyToken(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  return { id: payload.sub, name: payload.name };
}
