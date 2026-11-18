import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { financeLimiter } from '../middleware/rateLimiters.js';
import { listCommittees, createCommittee, updateCommittee, removeCommittee, payRound, undoRound, markPayout, undoPayout } from '../controllers/committeeController.js';

const write = [requireRole('owner', 'admin', 'member'), financeLimiter];

const router = Router();
router.use(authenticate);
router.get('/', listCommittees);
router.post('/', ...write, createCommittee);
router.put('/:id', ...write, updateCommittee);
router.patch('/:id', ...write, updateCommittee);
router.delete('/:id', ...write, removeCommittee);
router.post('/:id/payments', ...write, payRound);
router.delete('/:id/payments/:round', ...write, undoRound);
router.post('/:id/payout', ...write, markPayout);
router.delete('/:id/payout', ...write, undoPayout);

export default router;
