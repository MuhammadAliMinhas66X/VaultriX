import api from './api.js';
import { toApiError } from './apiError.js';

const run = async (request) => {
  try {
    const { data } = await request();
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const listBudgets = () => run(() => api.get('/budgets'));
export const saveBudget = (payload) => run(() => api.put('/budgets', payload));
export const removeBudget = (id) => run(() => api.delete(`/budgets/${id}`));

export const listGoals = () => run(() => api.get('/goals'));
export const createGoal = (payload) => run(() => api.post('/goals', payload));
export const updateGoal = (id, payload) => run(() => api.put(`/goals/${id}`, payload));
export const removeGoal = (id) => run(() => api.delete(`/goals/${id}`));
export const addContribution = (id, payload) => run(() => api.post(`/goals/${id}/contributions`, payload));
export const removeContribution = (id, contributionId) => run(() => api.delete(`/goals/${id}/contributions/${contributionId}`));

export const listSavings = () => run(() => api.get('/savings'));
export const addSaving = (payload) => run(() => api.post('/savings', payload));
export const removeSaving = (id) => run(() => api.delete(`/savings/${id}`));
