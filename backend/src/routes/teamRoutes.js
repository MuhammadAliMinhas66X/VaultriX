import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { inviteLimiter, joinLimiter, teamLimiter } from '../middleware/rateLimiters.js';
import { listTeam, createInvite, revokeInvite, joinWithCode, changeRole, removeMember, leaveWorkspace } from '../controllers/teamController.js';

const router = Router();

router.use(authenticate);

router.get('/', teamLimiter, listTeam);
router.post('/invites', inviteLimiter, createInvite);
router.delete('/invites/:id', teamLimiter, revokeInvite);
router.post('/join', joinLimiter, joinWithCode);
router.post('/leave', teamLimiter, leaveWorkspace);
router.patch('/members/:id', teamLimiter, changeRole);
router.delete('/members/:id', teamLimiter, removeMember);

export default router;
