import { applyCors, requireAdmin } from '../../lib/auth.js';
import { getStats } from '../../lib/db.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (!requireAdmin(req, res)) return;

  try {
    const stats = await getStats();
    return res.status(200).json({ success: true, stats });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    return res.status(500).json({ error: 'Could not load stats' });
  }
}
