import { PAKISTANI_BANKS, DIGITAL_WALLETS } from '../../utils/paymentBrands.js';

export const OTHER_BANK = 'bank:__other__';
export const OTHER_WALLET = 'wallet:__other__';

export const keyFor = (method, name) => {
  if (!method) return '';
  if (method === 'cash') return 'cash:';
  const list = method === 'bank' ? PAKISTANI_BANKS : DIGITAL_WALLETS;
  return list.some((item) => item.name === name) ? `${method}:${name}` : `${method}:__other__`;
};

export const customFor = (method, name) => {
  if (!method || method === 'cash') return '';
  const list = method === 'bank' ? PAKISTANI_BANKS : DIGITAL_WALLETS;
  return list.some((item) => item.name === name) ? '' : name || '';
};

export const splitKey = (key, custom) => {
  if (!key) return { method: '', name: '' };
  const index = key.indexOf(':');
  const method = key.slice(0, index);
  const rest = key.slice(index + 1);
  if (method === 'cash') return { method, name: '' };
  return { method, name: rest === '__other__' ? custom.trim() : rest };
};

export const isOtherKey = (key) => key === OTHER_BANK || key === OTHER_WALLET;

export const methodOf = (key) => (key ? key.slice(0, key.indexOf(':')) : '');

export const todayLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
