import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { securityEventLimiter } from '../middleware/rateLimiters.js';
import { recordClientEvent } from '../controllers/securityController.js';

const router = Router();

router.post('/events', authenticate, securityEventLimiter, recordClientEvent);

export default router;
