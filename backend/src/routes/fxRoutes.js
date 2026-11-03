import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { fxLimiter } from '../middleware/rateLimiters.js';
import { getExchangeRates } from '../controllers/fxController.js';

const router = Router();

router.use(authenticate);
router.get('/rates', fxLimiter, getExchangeRates);

export default router;
