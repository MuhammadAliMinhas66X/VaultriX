import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { financeLimiter } from '../middleware/rateLimiters.js';
import { listBudgets, saveBudget, removeBudget, listGoals, createGoal, updateGoal, removeGoal, addContribution, removeContribution, listSavings, addSaving, removeSaving } from '../controllers/planningController.js';

const write = [requireRole('owner', 'admin', 'member'), financeLimiter];

export const budgetRouter = Router();
budgetRouter.use(authenticate);
budgetRouter.get('/', listBudgets);
budgetRouter.put('/', ...write, saveBudget);
budgetRouter.delete('/:id', ...write, removeBudget);

export const goalRouter = Router();
goalRouter.use(authenticate);
goalRouter.get('/', listGoals);
goalRouter.post('/', ...write, createGoal);
goalRouter.put('/:id', ...write, updateGoal);
goalRouter.patch('/:id', ...write, updateGoal);
goalRouter.delete('/:id', ...write, removeGoal);
goalRouter.post('/:id/contributions', ...write, addContribution);
goalRouter.delete('/:id/contributions/:contributionId', ...write, removeContribution);

export const savingsRouter = Router();
savingsRouter.use(authenticate);
savingsRouter.get('/', listSavings);
savingsRouter.post('/', ...write, addSaving);
savingsRouter.delete('/:id', ...write, removeSaving);
