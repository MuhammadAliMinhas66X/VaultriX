import { Router } from 'express';
import {
  updateProfile,
  changePassword,
  changeAvatar,
  listSessions,
  revokeSession,
  logoutAllSessions,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/upload.js';
import { passwordChangeLimiter, sessionsLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.patch('/me', authenticate, updateProfile);
router.post('/me/password', authenticate, passwordChangeLimiter, changePassword);
router.post('/me/avatar', authenticate, uploadAvatar, changeAvatar);
router.get('/me/sessions', authenticate, sessionsLimiter, listSessions);
router.delete('/me/sessions/:id', authenticate, sessionsLimiter, revokeSession);
router.post('/me/sessions/logout-all', authenticate, sessionsLimiter, logoutAllSessions);

export default router;
