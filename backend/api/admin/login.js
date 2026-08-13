import bcrypt from 'bcryptjs';
import { applyCors, signAdminToken } from '../../lib/auth.js';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
let ADMIN_PASSWORD_HASH = null;

function ensurePasswordHash() {
  if (!ADMIN_PASSWORD_HASH) {
    const plain = process.env.ADMIN_PASSWORD || 'admin';
    ADMIN_PASSWORD_HASH = bcrypt.hashSync(plain, 10);
  }
  return ADMIN_PASSWORD_HASH;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const hash = ensurePasswordHash();
  const usernameOk = username === ADMIN_USERNAME;
  const passwordOk = bcrypt.compareSync(password, hash);

  if (!usernameOk || !passwordOk) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = signAdminToken(username);
  return res.status(200).json({ success: true, token, username });
}
