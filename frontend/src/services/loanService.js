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

const sendImage = (url, file) => {
  const form = new FormData();
  form.append('image', file);
  return run(() => api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }));
};

export const listLoans = () => run(() => api.get('/loans'));
export const createLoan = (payload) => run(() => api.post('/loans', payload));
export const updateLoan = (id, payload) => run(() => api.patch(`/loans/${id}`, payload));
export const deleteLoan = (id) => run(() => api.delete(`/loans/${id}`));

export const addLoanPayment = (id, payload) => run(() => api.post(`/loans/${id}/payments`, payload));
export const deleteLoanPayment = (id, paymentId) => run(() => api.delete(`/loans/${id}/payments/${paymentId}`));

export const uploadReceivedProof = (id, file) => sendImage(`/loans/${id}/received-proof`, file);
export const removeReceivedProof = (id) => run(() => api.delete(`/loans/${id}/received-proof`));
export const uploadPaymentProof = (id, paymentId, file) => sendImage(`/loans/${id}/payments/${paymentId}/proof`, file);
export const removePaymentProof = (id, paymentId) => run(() => api.delete(`/loans/${id}/payments/${paymentId}/proof`));
