import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { financeLimiter } from '../middleware/rateLimiters.js';
import { getExchangeRates } from '../controllers/fxController.js';

const router = Router();

router.use(authenticate);
router.get('/rates', financeLimiter, getExchangeRates);

export default router;
