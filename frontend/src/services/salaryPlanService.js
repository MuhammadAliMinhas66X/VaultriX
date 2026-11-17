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

export const getSalaryPlan = (month) => run(() => api.get(`/salary-plan/${month}`));
export const saveSalaryPlan = (month, payload) => run(() => api.put(`/salary-plan/${month}`, payload));
