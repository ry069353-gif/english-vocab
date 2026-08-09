/* ============================================
   English Vocab — Backend Server
   Node.js + Express + SQLite
   ============================================ */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// Fail fast with a clear message if required secrets are missing
if (!process.env.JWT_SECRET) {
  console.error('❌ Missing JWT_SECRET in .env — generate one with:');
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ====== CORS ======
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, server-to-server, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json());

// ====== RATE LIMITING ======
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', generalLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // limit repeated login attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});
app.use('/api/admin/login', loginLimiter);

// ====== HEALTH CHECK ======
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'English Vocab Backend', version: '1.0.0' });
});

// ====== ROUTES ======
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);

// ====== 404 ======
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ====== ERROR HANDLER ======
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ English Vocab backend running on port ${PORT}`);
});
