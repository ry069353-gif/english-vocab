/* ============================================
   Database — Turso (libsql) client.
   Works with a real Turso cloud DB in production,
   and a local file DB (file:local.db) for testing.
   ============================================ */

import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN; // not needed for local file mode

export const db = createClient(
  authToken ? { url, authToken } : { url }
);

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;
  await db.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      picture TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      login_count INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS login_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      login_at TEXT NOT NULL DEFAULT (datetime('now')),
      ip_address TEXT,
      user_agent TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      google_id TEXT,
      subscribed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ], 'write');
  initialized = true;
}

// ====== USER HELPERS ======

export async function findUserByGoogleId(googleId) {
  await ensureSchema();
  const r = await db.execute({ sql: 'SELECT * FROM users WHERE google_id = ?', args: [googleId] });
  return r.rows[0] || null;
}

export async function findUserById(id) {
  await ensureSchema();
  const r = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return r.rows[0] || null;
}

export async function createUser({ googleId, email, name, picture }) {
  await ensureSchema();
  const r = await db.execute({
    sql: `INSERT INTO users (google_id, email, name, picture, login_count, last_login)
          VALUES (?, ?, ?, ?, 1, datetime('now'))`,
    args: [googleId, email, name, picture || null]
  });
  return findUserById(Number(r.lastInsertRowid));
}

export async function recordLogin(userId, { ipAddress, userAgent } = {}) {
  await ensureSchema();
  await db.execute({
    sql: `UPDATE users SET login_count = login_count + 1, last_login = datetime('now') WHERE id = ?`,
    args: [userId]
  });
  await db.execute({
    sql: `INSERT INTO login_history (user_id, ip_address, user_agent) VALUES (?, ?, ?)`,
    args: [userId, ipAddress || null, userAgent || null]
  });
}

export async function setUserActive(userId, isActive) {
  await ensureSchema();
  await db.execute({
    sql: 'UPDATE users SET is_active = ? WHERE id = ?',
    args: [isActive ? 1 : 0, userId]
  });
}

export async function getAllUsers() {
  await ensureSchema();
  const r = await db.execute(`
    SELECT id, google_id, email, name, picture, is_active, login_count, joined_at, last_login
    FROM users ORDER BY last_login DESC
  `);
  return r.rows;
}

export async function getUserLoginHistory(userId, limit = 20) {
  await ensureSchema();
  const r = await db.execute({
    sql: `SELECT id, login_at, ip_address, user_agent FROM login_history
          WHERE user_id = ? ORDER BY login_at DESC LIMIT ?`,
    args: [userId, limit]
  });
  return r.rows;
}

// ====== STATS HELPERS ======

export async function getStats() {
  await ensureSchema();
  const totalUsers = (await db.execute('SELECT COUNT(*) c FROM users')).rows[0].c;
  const activeUsers = (await db.execute('SELECT COUNT(*) c FROM users WHERE is_active = 1')).rows[0].c;
  const newUsersToday = (await db.execute(`SELECT COUNT(*) c FROM users WHERE date(joined_at) = date('now')`)).rows[0].c;
  const newUsersWeek = (await db.execute(`SELECT COUNT(*) c FROM users WHERE joined_at >= datetime('now', '-7 days')`)).rows[0].c;
  const totalLogins = (await db.execute('SELECT COALESCE(SUM(login_count),0) c FROM users')).rows[0].c;
  const loginsToday = (await db.execute(`SELECT COUNT(*) c FROM login_history WHERE date(login_at) = date('now')`)).rows[0].c;
  const topUsers = (await db.execute(`
    SELECT id, name, email, login_count FROM users ORDER BY login_count DESC LIMIT 5
  `)).rows;

  return { totalUsers, activeUsers, newUsersToday, newUsersWeek, totalLogins, loginsToday, topUsers };
}

// ====== SUBSCRIBER HELPERS ======

export async function addSubscriber({ email, name, googleId }) {
  await ensureSchema();
  await db.execute({
    sql: `INSERT INTO subscribers (email, name, google_id) VALUES (?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET name = excluded.name, google_id = excluded.google_id`,
    args: [email, name || null, googleId || null]
  });
  const r = await db.execute({ sql: 'SELECT * FROM subscribers WHERE email = ?', args: [email] });
  return r.rows[0];
}

export async function getSubscriberStats() {
  await ensureSchema();
  const totalSubscribers = (await db.execute('SELECT COUNT(*) c FROM subscribers')).rows[0].c;
  return { totalSubscribers };
}
