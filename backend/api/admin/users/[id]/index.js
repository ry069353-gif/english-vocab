import { applyCors, requireAdmin } from '../../../../lib/auth.js';
import { findUserById, getUserLoginHistory, setUserActive } from '../../../../lib/db.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (!requireAdmin(req, res)) return;

  const { id } = req.query;

  try {
    const user = await findUserById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (req.method === 'GET') {
      const history = await getUserLoginHistory(user.id);
      return res.status(200).json({ success: true, user, history });
    }

    if (req.method === 'DELETE') {
      await setUserActive(user.id, false);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('User detail/deactivate error:', err.message);
    return res.status(500).json({ error: 'Could not process request' });
  }
}
