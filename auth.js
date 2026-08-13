/* ============================================
   Auth + CORS helpers for Vercel serverless functions.
   No Express here — plain (req, res) handlers.
   ============================================ */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export function signAdminToken(username) {
  return jwt.sign({ role: 'admin', username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function signUserToken(user) {
  return jwt.sign({ sub: user.google_id, userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
}

// Returns the decoded admin payload, or null if missing/invalid.
export function getAdminFromRequest(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}

// Call at the top of every /api/admin/* handler except login.
// Returns true if authorized; sends a 401 and returns false otherwise.
export function requireAdmin(req, res) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    res.status(401).json({ error: 'Missing or invalid admin token' });
    return false;
  }
  return true;
}

// ====== CORS ======
// Call at the top of every handler. Returns true if the request was
// a preflight OPTIONS request that has already been answered.
export function applyCors(req, res) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const origin = req.headers.origin;
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
