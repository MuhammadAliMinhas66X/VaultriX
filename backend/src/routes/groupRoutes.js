import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { inviteLimiter, joinLimiter, teamLimiter } from '../middleware/rateLimiters.js';
import {
  listGroups,
  createGroup,
  getGroup,
  renameGroup,
  deleteGroup,
  leaveGroup,
  createGroupInvite,
  revokeGroupInvite,
  joinGroup,
  addGroupExpense,
  updateGroupExpense,
  deleteGroupExpense,
  shareToMyExpenses,
  addSettlement,
  deleteSettlement,
} from '../controllers/groupController.js';

const router = Router();
const canWrite = requireRole('owner', 'admin', 'member');

router.use(authenticate);

router.get('/', teamLimiter, listGroups);
router.post('/', teamLimiter, createGroup);
router.post('/join', joinLimiter, joinGroup);
router.get('/:id', teamLimiter, getGroup);
router.patch('/:id', teamLimiter, renameGroup);
router.delete('/:id', teamLimiter, deleteGroup);
router.post('/:id/leave', teamLimiter, leaveGroup);
router.post('/:id/invites', inviteLimiter, createGroupInvite);
router.delete('/:id/invites/:inviteId', teamLimiter, revokeGroupInvite);
router.post('/:id/expenses', teamLimiter, addGroupExpense);
router.patch('/:id/expenses/:expenseId', teamLimiter, updateGroupExpense);
router.delete('/:id/expenses/:expenseId', teamLimiter, deleteGroupExpense);
router.post('/:id/expenses/:expenseId/my-expenses', canWrite, teamLimiter, shareToMyExpenses);
router.post('/:id/settlements', teamLimiter, addSettlement);
router.delete('/:id/settlements/:settlementId', teamLimiter, deleteSettlement);

export default router;
