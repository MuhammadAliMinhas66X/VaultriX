import { securityLog } from '../utils/securityLog.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXEMPT_PATHS = new Set(['/api/auth/google/callback']);

export const originGuard = (origins) => (req, res, next) => {
  if (!UNSAFE_METHODS.has(req.method)) return next();
  if (EXEMPT_PATHS.has(req.originalUrl.split('?')[0])) return next();

  const origin = req.get('origin');
  if (!origin || origins.includes(origin)) return next();

  securityLog('origin_blocked', req, { origin: String(origin).slice(0, 200) });
  return res.status(403).json({ success: false, message: 'Something went wrong. Please try again.' });
};
