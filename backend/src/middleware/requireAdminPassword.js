import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { securityLog } from '../utils/securityLog.js';

const fail = (res, message) => res.status(400).json({ success: false, message });

export const requireAdminPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('passwordHash');
    if (!user || !user.passwordHash) return next();

    const password = req.get('x-confirm-password');
    if (!password) return fail(res, 'Enter your password to continue.');

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      securityLog('admin_stepup_failed', req, { userId: req.user.id, path: req.originalUrl.split('?')[0] });
      return fail(res, 'Your password is not right.');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
