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

// Downloads one CSV file (expenses, income, bills or loans) through the signed-in session.
export const downloadExport = async (kind) => {
  const blob = await run(() => api.get(`/data/export/${kind}`, { responseType: 'blob' }));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vaultrix-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const importExpenseRows = (rows) => run(() => api.post('/data/import/expenses', { rows }));
