/* ============================================
   Public auth routes
   - POST /api/auth/google   → verify Google credential, create/find user
   - POST /api/subscribe     → email subscribe
   - GET  /api/stats         → public-safe stats (used by email-subscribe.js)
   ============================================ */

const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const {
  findUserByGoogleId,
  createUser,
  recordLogin,
  addSubscriber,
  getSubscriberStats
} = require('../db');

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ====== POST /api/auth/google ======
router.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential' });
    }
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Backend not configured: set GOOGLE_CLIENT_ID' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload.email_verified) {
      return res.status(400).json({ error: 'Email not verified' });
    }

    let user = findUserByGoogleId(payload.sub);
    if (!user) {
      user = createUser({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture
      });
    } else {
      if (!user.is_active) {
        return res.status(403).json({ error: 'This account has been deactivated' });
      }
      recordLogin(user.id, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    const token = jwt.sign(
      { sub: user.google_id, userId: user.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        google_id: user.google_id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        joined_at: user.joined_at
      }
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    return res.status(401).json({ error: 'Invalid Google credential' });
  }
});

// ====== POST /api/subscribe ======
router.post('/subscribe', (req, res) => {
  try {
    const { email, name, googleId } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    const sub = addSubscriber({ email, name, googleId });
    return res.json({ success: true, subscriber: sub });
  } catch (err) {
    console.error('Subscribe error:', err.message);
    return res.status(500).json({ error: 'Could not subscribe' });
  }
});

// ====== GET /api/stats (public, subscriber count only) ======
router.get('/stats', (req, res) => {
  try {
    return res.json({ success: true, stats: getSubscriberStats() });
  } catch (err) {
    return res.status(500).json({ error: 'Could not load stats' });
  }
});

module.exports = router;
