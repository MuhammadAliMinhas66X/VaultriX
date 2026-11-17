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

export const listGroups = () => run(() => api.get('/groups'));
export const createGroup = (name, currency) => run(() => api.post('/groups', { name, currency }));
export const getGroup = (id) => run(() => api.get(`/groups/${id}`));
export const deleteGroup = (id) => run(() => api.delete(`/groups/${id}`));
export const leaveGroup = (id) => run(() => api.post(`/groups/${id}/leave`));
export const joinGroup = (code) => run(() => api.post('/groups/join', { code }));
export const inviteToGroup = (id, email) => run(() => api.post(`/groups/${id}/invites`, { email }));
export const revokeGroupInvite = (id, inviteId) => run(() => api.delete(`/groups/${id}/invites/${inviteId}`));
export const addGroupExpense = (id, payload) => run(() => api.post(`/groups/${id}/expenses`, payload));
export const updateGroupExpense = (id, expenseId, payload) => run(() => api.patch(`/groups/${id}/expenses/${expenseId}`, payload));
export const deleteGroupExpense = (id, expenseId) => run(() => api.delete(`/groups/${id}/expenses/${expenseId}`));
export const shareToMyExpenses = (id, expenseId) => run(() => api.post(`/groups/${id}/expenses/${expenseId}/my-expenses`));
export const addSettlement = (id, payload) => run(() => api.post(`/groups/${id}/settlements`, payload));
export const deleteSettlement = (id, settlementId) => run(() => api.delete(`/groups/${id}/settlements/${settlementId}`));
export const listMyInvites = () => run(() => api.get('/groups/invites/mine'));
export const acceptMyInvite = (inviteId) => run(() => api.post(`/groups/invites/${inviteId}/accept`));
export const declineMyInvite = (inviteId) => run(() => api.delete(`/groups/invites/${inviteId}`));
