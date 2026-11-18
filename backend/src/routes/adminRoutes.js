import { Router } from 'express';
import {
  getOverview,
  listUsers,
  getUserDetail,
  updateUserAsAdmin,
  deactivateUser,
  reactivateUser,
  deleteUserAsAdmin,
  forcePasswordReset,
  disableUserMfa,
  revokeUserSession,
  getAuditLog,
  unlockUserAccount,
  getSecurityOverview,
  exportUsersCsv,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { stepUpLimiter, healthCheckLimiter } from '../middleware/rateLimiters.js';
import { getHealth, runHealthCheck } from '../controllers/healthController.js';
import { requireAdminPassword } from '../middleware/requireAdminPassword.js';

const router = Router();

// Every route here needs a signed-in session AND that session to belong to
// ADMIN_EMAIL - requireAdmin 404s anyone else rather than revealing this
// router exists at all.
router.use(authenticate, requireAdmin);

const stepUp = [stepUpLimiter, requireAdminPassword];

router.get('/overview', getOverview);
router.get('/audit-log', getAuditLog);
router.get('/security-overview', getSecurityOverview);

// System health (docs/audit/API-HEALTH-MONITORING.md). Admin only, like
// everything in this router. GET returns the cached snapshot; POST re-runs
// the checks and is throttled.
router.get('/health', getHealth);
router.post('/health/check', healthCheckLimiter, runHealthCheck);

// Must come before '/users/:id' - otherwise Express would match "export"
// as an :id param and hand this request to getUserDetail instead.
router.get('/users/export', stepUp, exportUsersCsv);

router.get('/users', listUsers);
router.get('/users/:id', getUserDetail);
router.patch('/users/:id', updateUserAsAdmin);
router.post('/users/:id/deactivate', deactivateUser);
router.post('/users/:id/reactivate', reactivateUser);
router.post('/users/:id/unlock', unlockUserAccount);
router.delete('/users/:id', stepUp, deleteUserAsAdmin);
router.post('/users/:id/force-password-reset', stepUp, forcePasswordReset);
router.post('/users/:id/disable-mfa', stepUp, disableUserMfa);
router.delete('/users/:id/sessions/:sessionId', revokeUserSession);

export default router;
