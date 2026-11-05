import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { financeLimiter } from '../middleware/rateLimiters.js';
import {
  listBills,
  createBill,
  updateBill,
  deleteBill,
  addBillPayment,
  deleteBillPayment,
  setBillCancelled,
  changeRecurring,
} from '../controllers/billController.js';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'member');

router.get('/', listBills);
router.post('/', canWrite, financeLimiter, createBill);
router.patch('/:id', canWrite, financeLimiter, updateBill);
router.delete('/:id', canWrite, financeLimiter, deleteBill);

router.post('/:id/payments', canWrite, financeLimiter, addBillPayment);
router.delete('/:id/payments/:paymentId', canWrite, financeLimiter, deleteBillPayment);
router.post('/:id/cancel', canWrite, financeLimiter, setBillCancelled);
router.post('/:id/recurring', canWrite, financeLimiter, changeRecurring);

export default router;
