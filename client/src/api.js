import { getToken } from './utils/token.js';

const base = import.meta.env.VITE_SERVER_URL || '';

export const serverUrl = base;

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error('Server is not reachable. Make sure the backend is running.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return data;
}

export const register = (name, email, password) =>
  request('/api/auth/register', { method: 'POST', body: { name, email, password }, auth: false });

export const login = (email, password) =>
  request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false });

export const fetchMe = () => request('/api/auth/me');

export async function createRoom() {
  const data = await request('/api/rooms', { method: 'POST' });
  return data.roomId;
}

export async function roomExists(roomId) {
  try {
    await request(`/api/rooms/${encodeURIComponent(roomId)}`);
    return true;
  } catch (err) {
    if (err.status === 404) return false;
    throw err;
  }
}
