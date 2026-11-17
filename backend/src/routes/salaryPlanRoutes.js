import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { financeLimiter } from '../middleware/rateLimiters.js';
import { getSalaryPlan, listSalaryPlans, saveSalaryPlan } from '../controllers/salaryPlanController.js';

const router = Router();
router.use(authenticate);

router.get('/', listSalaryPlans);
router.get('/:month', getSalaryPlan);
router.put('/:month', requireRole('owner', 'admin', 'member'), financeLimiter, saveSalaryPlan);

export default router;
