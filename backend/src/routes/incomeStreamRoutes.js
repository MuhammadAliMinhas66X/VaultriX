import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { financeLimiter } from '../middleware/rateLimiters.js';
import {
  listIncomeStreams,
  createIncomeStream,
  updateIncomeStream,
  deleteIncomeStream,
} from '../controllers/incomeStreamController.js';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'member');

router.get('/', listIncomeStreams);
router.post('/', canWrite, financeLimiter, createIncomeStream);
router.patch('/:id', canWrite, financeLimiter, updateIncomeStream);
router.delete('/:id', canWrite, financeLimiter, deleteIncomeStream);

export default router;
