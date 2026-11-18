import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { financeLimiter } from '../middleware/rateLimiters.js';
import {
  listCommittees,
  createCommittee,
  updateCommittee,
  removeCommittee,
  payRound,
  undoRound,
  markPayout,
  undoPayout,
  addMember,
  renameMember,
  removeMember,
  payForMember,
  undoMemberPayment,
  collectRound,
  setWinner,
  markHandedOver,
  undoHandedOver,
} from '../controllers/committeeController.js';

const write = [requireRole('owner', 'admin', 'member'), financeLimiter];

const router = Router();
router.use(authenticate);
router.get('/', listCommittees);
router.post('/', ...write, createCommittee);
router.put('/:id', ...write, updateCommittee);
router.patch('/:id', ...write, updateCommittee);
router.delete('/:id', ...write, removeCommittee);
// My own payments and my own payout
router.post('/:id/payments', ...write, payRound);
router.delete('/:id/payments/:round', ...write, undoRound);
router.post('/:id/payout', ...write, markPayout);
router.delete('/:id/payout', ...write, undoPayout);
// Organizer: the people, what they paid, who wins which round, and handing the pot over
router.post('/:id/members', ...write, addMember);
router.patch('/:id/members/:memberId', ...write, renameMember);
router.delete('/:id/members/:memberId', ...write, removeMember);
router.post('/:id/members/:memberId/payments', ...write, payForMember);
router.delete('/:id/members/:memberId/payments/:round', ...write, undoMemberPayment);
router.post('/:id/rounds/:round/collect', ...write, collectRound);
router.put('/:id/rounds/:round/winner', ...write, setWinner);
router.post('/:id/rounds/:round/handover', ...write, markHandedOver);
router.delete('/:id/rounds/:round/handover', ...write, undoHandedOver);

export default router;
