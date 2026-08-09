/* ============================================
   Admin routes — everything here except /login
   requires a valid admin Bearer token.
   ============================================ */

const express = require('express');
const bcrypt = require('bcryptjs');

const { signAdminToken, requireAdmin } = require('../middleware/auth');
const {
  getAllUsers,
  findUserById,
  getUserLoginHistory,
  setUserActive,
  getStats
} = require('../db');

const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
// Password is stored as a bcrypt hash in memory at boot (see below),
// generated from ADMIN_PASSWORD in .env so it's never compared in plain text.
let ADMIN_PASSWORD_HASH = null;

function ensurePasswordHash() {
  if (!ADMIN_PASSWORD_HASH) {
    const plain = process.env.ADMIN_PASSWORD || 'admin';
    ADMIN_PASSWORD_HASH = bcrypt.hashSync(plain, 10);
  }
  return ADMIN_PASSWORD_HASH;
}

// ====== POST /api/admin/login ======
router.post('/login', (req, res) => {
  const { username, password } = req.body;

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
  return res.json({ success: true, token, username });
});

// Everything below this line requires a valid admin token
router.use(requireAdmin);

// ====== GET /api/admin/stats ======
router.get('/stats', (req, res) => {
  try {
    return res.json({ success: true, stats: getStats() });
  } catch (err) {
    console.error('Stats error:', err.message);
    return res.status(500).json({ error: 'Could not load stats' });
  }
});

// ====== GET /api/admin/users ======
router.get('/users', (req, res) => {
  try {
    const users = getAllUsers().map(u => ({ ...u, total_logins: u.login_count }));
    return res.json({ success: true, users });
  } catch (err) {
    console.error('Users error:', err.message);
    return res.status(500).json({ error: 'Could not load users' });
  }
});

// ====== GET /api/admin/users/:id ======
router.get('/users/:id', (req, res) => {
  try {
    const user = findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const history = getUserLoginHistory(user.id);
    return res.json({ success: true, user, history });
  } catch (err) {
    console.error('User detail error:', err.message);
    return res.status(500).json({ error: 'Could not load user' });
  }
});

// ====== POST /api/admin/users/:id/activate ======
router.post('/users/:id/activate', (req, res) => {
  try {
    const user = findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    setUserActive(user.id, true);
    return res.json({ success: true });
  } catch (err) {
    console.error('Activate error:', err.message);
    return res.status(500).json({ error: 'Could not activate user' });
  }
});

// ====== DELETE /api/admin/users/:id  (soft-deactivate) ======
router.delete('/users/:id', (req, res) => {
  try {
    const user = findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    setUserActive(user.id, false);
    return res.json({ success: true });
  } catch (err) {
    console.error('Deactivate error:', err.message);
    return res.status(500).json({ error: 'Could not deactivate user' });
  }
});

module.exports = router;
