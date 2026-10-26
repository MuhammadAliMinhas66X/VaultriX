import api from './api.js';
import { toApiError } from './apiError.js';

export const getExchangeRates = async (base, symbols = []) => {
  try {
    const params = { base };
    if (symbols.length) params.symbols = symbols.join(',');
    const { data } = await api.get('/fx/rates', { params });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};
