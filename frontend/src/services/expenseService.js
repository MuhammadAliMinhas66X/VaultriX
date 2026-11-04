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

export const listExpenses = (month) => run(() => api.get('/expenses', { params: { month } }));
export const createExpense = (payload) => run(() => api.post('/expenses', payload));
export const updateExpense = (id, payload) => run(() => api.patch(`/expenses/${id}`, payload));
export const deleteExpense = (id) => run(() => api.delete(`/expenses/${id}`));

export const listExpenseCategories = async () => {
  const data = await run(() => api.get('/categories'));
  return data.categories.filter((category) => category.type === 'expense');
};
export const createExpenseCategory = (name, icon = '') => run(() => api.post('/categories', { name, type: 'expense', icon }));
export const updateExpenseCategory = (id, patch) => run(() => api.patch(`/categories/${id}`, patch));
export const deleteExpenseCategory = (id) => run(() => api.delete(`/categories/${id}`));
