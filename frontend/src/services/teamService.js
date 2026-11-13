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

export const getTeam = () => run(() => api.get('/team'));
export const createInvite = (email, role) => run(() => api.post('/team/invites', { email, role }));
export const revokeInvite = (id) => run(() => api.delete(`/team/invites/${id}`));
export const joinWithCode = (code) => run(() => api.post('/team/join', { code }));
export const leaveWorkspace = () => run(() => api.post('/team/leave', {}));
export const changeMemberRole = (id, role) => run(() => api.patch(`/team/members/${id}`, { role }));
export const removeMember = (id) => run(() => api.delete(`/team/members/${id}`));
