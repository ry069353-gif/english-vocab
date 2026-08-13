import { applyCors, requireAdmin } from '../../../lib/auth.js';
import { getAllUsers } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (!requireAdmin(req, res)) return;

  try {
    const users = (await getAllUsers()).map(u => ({ ...u, total_logins: u.login_count }));
    return res.status(200).json({ success: true, users });
  } catch (err) {
    console.error('Users error:', err.message);
    return res.status(500).json({ error: 'Could not load users' });
  }
}
