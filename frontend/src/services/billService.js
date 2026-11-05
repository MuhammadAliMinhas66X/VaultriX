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

export const listBills = (today) => run(() => api.get('/bills', { params: { today } }));
export const createBill = (payload) => run(() => api.post('/bills', payload));
export const updateBill = (id, payload) => run(() => api.patch(`/bills/${id}`, payload));
export const deleteBill = (id) => run(() => api.delete(`/bills/${id}`));
export const addBillPayment = (id, payload) => run(() => api.post(`/bills/${id}/payments`, payload));
export const deleteBillPayment = (id, paymentId) => run(() => api.delete(`/bills/${id}/payments/${paymentId}`));
export const setBillCancelled = (id, cancelled) => run(() => api.post(`/bills/${id}/cancel`, { cancelled }));
export const changeBillRecurring = (id, action, today) => run(() => api.post(`/bills/${id}/recurring`, { action, today }));
