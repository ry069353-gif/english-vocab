import { applyCors } from '../lib/auth.js';
import { getSubscriberStats } from '../lib/db.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  try {
    const stats = await getSubscriberStats();
    return res.status(200).json({ success: true, stats });
  } catch (err) {
    console.error('Stats error:', err.message);
    return res.status(500).json({ error: 'Could not load stats' });
  }
}
