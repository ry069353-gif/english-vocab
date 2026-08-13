import { applyCors } from '../lib/auth.js';

export default function handler(req, res) {
  if (applyCors(req, res)) return;
  res.status(200).json({ status: 'ok', service: 'English Vocab Backend', version: '1.0.0' });
}
