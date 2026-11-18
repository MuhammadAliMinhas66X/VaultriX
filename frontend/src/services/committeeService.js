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

// Organizer: the people, what they paid, who wins which round, handing the pot over.
export const addMember = (id, name) => run(() => api.post(`/committees/${id}/members`, { name }));
export const renameMember = (id, memberId, name) => run(() => api.patch(`/committees/${id}/members/${memberId}`, { name }));
export const removeMember = (id, memberId) => run(() => api.delete(`/committees/${id}/members/${memberId}`));
export const payForMember = (id, memberId, round, date) => run(() => api.post(`/committees/${id}/members/${memberId}/payments`, { round, date }));
export const undoMemberPayment = (id, memberId, round) => run(() => api.delete(`/committees/${id}/members/${memberId}/payments/${round}`));
export const collectRound = (id, round, date) => run(() => api.post(`/committees/${id}/rounds/${round}/collect`, { date }));
export const setWinner = (id, round, holder) => run(() => api.put(`/committees/${id}/rounds/${round}/winner`, { holder }));
export const handOver = (id, round, date) => run(() => api.post(`/committees/${id}/rounds/${round}/handover`, { date }));
export const undoHandOver = (id, round) => run(() => api.delete(`/committees/${id}/rounds/${round}/handover`));
