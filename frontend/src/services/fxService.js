import api from './api.js';
import { toApiError } from './apiError.js';

// base: the app currency to convert everything else into. Response shape:
// { success, base, rates: { USD: 0.0036, ... }, fetchedAt, stale? }
export const getExchangeRates = async (base) => {
  try {
    const { data } = await api.get('/fx/rates', { params: { base } });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};
