import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { financeLimiter, uploadLimiter } from '../middleware/rateLimiters.js';
import { uploadProofImage } from '../middleware/upload.js';
import {
  listLoans,
  createLoan,
  updateLoan,
  deleteLoan,
  addPayment,
  deletePayment,
  setReceivedProof,
  removeReceivedProof,
  setPaymentProof,
  removePaymentProof,
} from '../controllers/loanController.js';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'member');

router.get('/', listLoans);
router.post('/', canWrite, financeLimiter, createLoan);
router.patch('/:id', canWrite, financeLimiter, updateLoan);
router.delete('/:id', canWrite, financeLimiter, deleteLoan);

router.post('/:id/payments', canWrite, financeLimiter, addPayment);
router.delete('/:id/payments/:paymentId', canWrite, financeLimiter, deletePayment);

router.post('/:id/received-proof', canWrite, uploadLimiter, uploadProofImage, setReceivedProof);
router.delete('/:id/received-proof', canWrite, financeLimiter, removeReceivedProof);
router.post('/:id/payments/:paymentId/proof', canWrite, uploadLimiter, uploadProofImage, setPaymentProof);
router.delete('/:id/payments/:paymentId/proof', canWrite, financeLimiter, removePaymentProof);

export default router;
