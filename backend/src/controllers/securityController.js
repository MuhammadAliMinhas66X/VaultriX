import { securityLog } from '../utils/securityLog.js';

const ALLOWED = new Set(['capture_key', 'print_attempt', 'save_attempt', 'fullscreen_exit', 'secure_on', 'secure_off']);

export const recordClientEvent = (req, res) => {
  const type = typeof req.body?.type === 'string' ? req.body.type : '';
  if (!ALLOWED.has(type)) return res.status(400).json({ success: false, message: 'Something went wrong. Please try again.' });
  securityLog(`client_${type}`, req, { userId: req.user.id, source: 'client' });
  res.json({ success: true });
};
