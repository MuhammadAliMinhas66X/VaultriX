import api from './api.js';
import { toApiError } from './apiError.js';

export const getAdminOverview = async () => {
  try {
    const { data } = await api.get('/admin/overview');
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const listAdminUsers = async ({ page = 1, search = '', status = 'all' } = {}) => {
  try {
    const { data } = await api.get('/admin/users', { params: { page, search, status } });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getAdminUserDetail = async (id) => {
  try {
    const { data } = await api.get(`/admin/users/${id}`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const updateAdminUser = async (id, payload) => {
  try {
    const { data } = await api.patch(`/admin/users/${id}`, payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const deactivateAdminUser = async (id) => {
  try {
    const { data } = await api.post(`/admin/users/${id}/deactivate`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const reactivateAdminUser = async (id) => {
  try {
    const { data } = await api.post(`/admin/users/${id}/reactivate`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

const stepUpHeaders = (password) => (password ? { headers: { 'x-confirm-password': password } } : {});

export const deleteAdminUser = async (id, password) => {
  try {
    const { data } = await api.delete(`/admin/users/${id}`, stepUpHeaders(password));
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const forceAdminPasswordReset = async (id, password) => {
  try {
    const { data } = await api.post(`/admin/users/${id}/force-password-reset`, null, stepUpHeaders(password));
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const disableAdminUserMfa = async (id, password) => {
  try {
    const { data } = await api.post(`/admin/users/${id}/disable-mfa`, null, stepUpHeaders(password));
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const revokeAdminUserSession = async (userId, sessionId) => {
  try {
    const { data } = await api.delete(`/admin/users/${userId}/sessions/${sessionId}`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getAdminAuditLog = async ({ page = 1, event = '' } = {}) => {
  try {
    const { data } = await api.get('/admin/audit-log', { params: { page, event } });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getAdminSecurityOverview = async () => {
  try {
    const { data } = await api.get('/admin/security-overview');
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const unlockAdminUser = async (id) => {
  try {
    const { data } = await api.post(`/admin/users/${id}/unlock`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

// Returns the raw CSV text, not JSON - the caller wraps it in a Blob and
// triggers a browser download. responseType 'text' avoids axios trying
// (and failing) to JSON.parse a CSV body.
export const exportAdminUsersCsv = async ({ search = '', status = 'all', password } = {}) => {
  try {
    const { data } = await api.get('/admin/users/export', { params: { search, status }, responseType: 'text', ...stepUpHeaders(password) });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};
