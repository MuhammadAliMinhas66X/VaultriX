import api from './api.js';
import { toApiError } from './apiError.js';

export const listAccounts = async (includeArchived = false) => {
  try {
    const { data } = await api.get('/accounts', { params: includeArchived ? { includeArchived: 'true' } : {} });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const createAccount = async (payload) => {
  try {
    const { data } = await api.post('/accounts', payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const updateAccount = async (id, payload) => {
  try {
    const { data } = await api.patch(`/accounts/${id}`, payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const deleteAccount = async (id) => {
  try {
    const { data } = await api.delete(`/accounts/${id}`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};
