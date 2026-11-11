import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { financeLimiter } from '../middleware/rateLimiters.js';
import {
  listReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  getOpeningBalance,
  setOpeningBalance,
} from '../controllers/receiptController.js';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'member');

// "/opening" must be declared before "/:id".
router.get('/opening', getOpeningBalance);
router.put('/opening', canWrite, financeLimiter, setOpeningBalance);

router.get('/', listReceipts);
router.post('/', canWrite, financeLimiter, createReceipt);
router.patch('/:id', canWrite, financeLimiter, updateReceipt);
router.delete('/:id', canWrite, financeLimiter, deleteReceipt);

export default router;
