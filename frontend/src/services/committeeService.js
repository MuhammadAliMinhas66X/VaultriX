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

export const listCommittees = (today) => run(() => api.get('/committees', { params: { today } }));
export const createCommittee = (payload) => run(() => api.post('/committees', payload));
export const updateCommittee = (id, payload) => run(() => api.put(`/committees/${id}`, payload));
export const removeCommittee = (id) => run(() => api.delete(`/committees/${id}`));
export const payRound = (id, round, date) => run(() => api.post(`/committees/${id}/payments`, { round, date }));
export const undoRound = (id, round) => run(() => api.delete(`/committees/${id}/payments/${round}`));
export const markPayout = (id, date) => run(() => api.post(`/committees/${id}/payout`, { date }));
export const undoPayout = (id) => run(() => api.delete(`/committees/${id}/payout`));
