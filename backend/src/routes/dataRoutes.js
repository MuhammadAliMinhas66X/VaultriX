import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { financeLimiter } from '../middleware/rateLimiters.js';
import { exportCsv, importExpenses, importMixed } from '../controllers/dataController.js';

const router = Router();

router.use(authenticate);

router.get('/export/:kind', financeLimiter, exportCsv);
router.post('/import/expenses', requireRole('owner', 'admin', 'member'), financeLimiter, importExpenses);

router.post('/import', requireRole('owner', 'admin', 'member'), financeLimiter, importMixed);

export default router;
