import { applyCors } from '../lib/auth.js';
import { addSubscriber } from '../lib/db.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, name, googleId } = req.body || {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    const sub = await addSubscriber({ email, name, googleId });
    return res.status(200).json({ success: true, subscriber: sub });
  } catch (err) {
    console.error('Subscribe error:', err.message);
    return res.status(500).json({ error: 'Could not subscribe' });
  }
}
