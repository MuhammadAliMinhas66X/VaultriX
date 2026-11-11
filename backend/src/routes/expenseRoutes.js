import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { financeLimiter } from '../middleware/rateLimiters.js';
import { listExpenses, expenseTotals, createExpense, updateExpense, deleteExpense } from '../controllers/expenseController.js';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'member');

router.get('/totals', expenseTotals);
router.get('/', listExpenses);
router.post('/', canWrite, financeLimiter, createExpense);
router.patch('/:id', canWrite, financeLimiter, updateExpense);
router.delete('/:id', canWrite, financeLimiter, deleteExpense);

export default router;
