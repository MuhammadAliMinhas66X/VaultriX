import api from './api.js';
import { toApiError } from './apiError.js';

// Always asks for archived streams too: the balance still needs them for old receipts.
export const listIncomeStreams = async () => {
  try {
    const { data } = await api.get('/income-streams', { params: { includeArchived: 'true' } });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const createIncomeStream = async (payload) => {
  try {
    const { data } = await api.post('/income-streams', payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const updateIncomeStream = async (id, payload) => {
  try {
    const { data } = await api.patch(`/income-streams/${id}`, payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const deleteIncomeStream = async (id) => {
  try {
    const { data } = await api.delete(`/income-streams/${id}`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};
