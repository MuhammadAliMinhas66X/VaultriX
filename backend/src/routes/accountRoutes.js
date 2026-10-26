import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { financeLimiter } from '../middleware/rateLimiters.js';
import { listAccounts, createAccount, updateAccount, deleteAccount } from '../controllers/accountController.js';

const router = Router();

router.use(authenticate);

// Any signed-in org member can read (including a viewer) - writes need
// owner/admin/member, matching the roles already on the User model.
const canWrite = requireRole('owner', 'admin', 'member');

router.get('/', listAccounts);
router.post('/', canWrite, financeLimiter, createAccount);
router.patch('/:id', canWrite, financeLimiter, updateAccount);
router.delete('/:id', canWrite, financeLimiter, deleteAccount);

export default router;
