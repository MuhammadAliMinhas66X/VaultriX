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

export const listReceipts = () => run(() => api.get('/receipts'));
export const createReceipt = (payload) => run(() => api.post('/receipts', payload));
export const updateReceipt = (id, payload) => run(() => api.patch(`/receipts/${id}`, payload));
export const deleteReceipt = (id) => run(() => api.delete(`/receipts/${id}`));

export const getOpeningBalance = () => run(() => api.get('/receipts/opening'));
export const setOpeningBalance = (payload) => run(() => api.put('/receipts/opening', payload));

// Money spent per month and currency (for the running balance).
export const getExpenseTotals = (since) => run(() => api.get('/expenses/totals', { params: since ? { since } : {} }));
