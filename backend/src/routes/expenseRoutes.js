import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { financeLimiter, uploadLimiter } from '../middleware/rateLimiters.js';
import { uploadProofImage } from '../middleware/upload.js';
import { listExpenses, expenseTotals, createExpense, updateExpense, deleteExpense, setReceipt, removeReceipt } from '../controllers/expenseController.js';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'member');

router.get('/totals', expenseTotals);
router.get('/', listExpenses);
router.post('/', canWrite, financeLimiter, createExpense);
router.patch('/:id', canWrite, financeLimiter, updateExpense);
router.delete('/:id', canWrite, financeLimiter, deleteExpense);
router.post('/:id/receipt', canWrite, uploadLimiter, uploadProofImage, setReceipt);
router.delete('/:id/receipt', canWrite, financeLimiter, removeReceipt);

export default router;
