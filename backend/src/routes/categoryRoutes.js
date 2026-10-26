import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { financeLimiter } from '../middleware/rateLimiters.js';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'member');

router.get('/', listCategories);
router.post('/', canWrite, financeLimiter, createCategory);
router.patch('/:id', canWrite, financeLimiter, updateCategory);
router.delete('/:id', canWrite, financeLimiter, deleteCategory);

export default router;
