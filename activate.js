import { applyCors, requireAdmin } from '../../../../lib/auth.js';
import { findUserById, setUserActive } from '../../../../lib/db.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;

  try {
    const user = await findUserById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await setUserActive(user.id, true);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Activate error:', err.message);
    return res.status(500).json({ error: 'Could not activate user' });
  }
}
