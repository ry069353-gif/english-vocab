/* ============================================
   Database setup (SQLite via better-sqlite3)
   Creates tables on first run and exposes
   simple helper functions used by the routes.
   ============================================ */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || './data/english-vocab.db';

// Make sure the folder for the DB file exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ====== SCHEMA ======
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    picture TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    login_count INTEGER NOT NULL DEFAULT 0,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login TEXT
  );

  CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    login_at TEXT NOT NULL DEFAULT (datetime('now')),
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    google_id TEXT,
    subscribed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ====== USER HELPERS ======

function findUserByGoogleId(googleId) {
  return db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
}

function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function createUser({ googleId, email, name, picture }) {
  const info = db.prepare(`
    INSERT INTO users (google_id, email, name, picture, login_count, last_login)
    VALUES (?, ?, ?, ?, 1, datetime('now'))
  `).run(googleId, email, name, picture || null);
  return findUserById(info.lastInsertRowid);
}

function recordLogin(userId, { ipAddress, userAgent } = {}) {
  db.prepare(`
    UPDATE users
    SET login_count = login_count + 1,
        last_login = datetime('now')
    WHERE id = ?
  `).run(userId);

  db.prepare(`
    INSERT INTO login_history (user_id, ip_address, user_agent)
    VALUES (?, ?, ?)
  `).run(userId, ipAddress || null, userAgent || null);
}

function setUserActive(userId, isActive) {
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, userId);
}

function getAllUsers() {
  return db.prepare(`
    SELECT id, google_id, email, name, picture, is_active, login_count, joined_at, last_login
    FROM users
    ORDER BY last_login DESC
  `).all();
}

function getUserLoginHistory(userId, limit = 20) {
  return db.prepare(`
    SELECT id, login_at, ip_address, user_agent
    FROM login_history
    WHERE user_id = ?
    ORDER BY login_at DESC
    LIMIT ?
  `).all(userId, limit);
}

// ====== STATS HELPERS ======

function getStats() {
  const totalUsers = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  const activeUsers = db.prepare('SELECT COUNT(*) c FROM users WHERE is_active = 1').get().c;
  const newUsersToday = db.prepare(`
    SELECT COUNT(*) c FROM users WHERE date(joined_at) = date('now')
  `).get().c;
  const newUsersWeek = db.prepare(`
    SELECT COUNT(*) c FROM users WHERE joined_at >= datetime('now', '-7 days')
  `).get().c;
  const totalLogins = db.prepare('SELECT COALESCE(SUM(login_count),0) c FROM users').get().c;
  const loginsToday = db.prepare(`
    SELECT COUNT(*) c FROM login_history WHERE date(login_at) = date('now')
  `).get().c;

  const topUsers = db.prepare(`
    SELECT id, name, email, login_count
    FROM users
    ORDER BY login_count DESC
    LIMIT 5
  `).all();

  return {
    totalUsers,
    activeUsers,
    newUsersToday,
    newUsersWeek,
    totalLogins,
    loginsToday,
    topUsers
  };
}

// ====== SUBSCRIBER HELPERS ======

function addSubscriber({ email, name, googleId }) {
  db.prepare(`
    INSERT INTO subscribers (email, name, google_id)
    VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET name = excluded.name, google_id = excluded.google_id
  `).run(email, name || null, googleId || null);
  return db.prepare('SELECT * FROM subscribers WHERE email = ?').get(email);
}

function getSubscriberStats() {
  const totalSubscribers = db.prepare('SELECT COUNT(*) c FROM subscribers').get().c;
  return { totalSubscribers };
}

module.exports = {
  db,
  findUserByGoogleId,
  findUserById,
  createUser,
  recordLogin,
  setUserActive,
  getAllUsers,
  getUserLoginHistory,
  getStats,
  addSubscriber,
  getSubscriberStats
};
