import { OAuth2Client } from 'google-auth-library';
import { applyCors, signUserToken } from '../../lib/auth.js';
import { findUserByGoogleId, createUser, recordLogin } from '../../lib/db.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'Missing Google credential' });
    if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Backend not configured: set GOOGLE_CLIENT_ID' });

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    if (!payload.email_verified) return res.status(400).json({ error: 'Email not verified' });

    let user = await findUserByGoogleId(payload.sub);
    if (!user) {
      user = await createUser({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture
      });
    } else {
      if (!user.is_active) return res.status(403).json({ error: 'This account has been deactivated' });
      await recordLogin(user.id, {
        ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent']
      });
    }

    const token = signUserToken(user);

    return res.status(200).json({
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
}
