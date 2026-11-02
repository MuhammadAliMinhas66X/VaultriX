import { LOAN_METHODS } from '../models/Loan.js';
import { cleanFreeText } from './validators.js';

export const toMajor = (minor) => Math.round(minor) / 100;

const toMinor = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100);

export const parseAmountMinor = (raw) => {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > 1e12) return undefined;
  const minor = toMinor(value);
  return minor >= 1 ? minor : undefined;
};

export const parseDay = (raw, { maxFutureDays = 1 } = {}) => {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(raw)) return undefined;
  const date = new Date(`${raw.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  if (date.getUTCFullYear() < 2000) return undefined;
  if (date.getTime() > Date.now() + maxFutureDays * 24 * 60 * 60 * 1000) return undefined;
  return date;
};

export const parseWhere = (methodRaw, nameRaw) => {
  const method = methodRaw === undefined || methodRaw === null ? '' : methodRaw;
  if (method === '') return { method: '', name: '' };
  if (!LOAN_METHODS.includes(method)) return undefined;
  if (method === 'cash') return { method, name: '' };
  const name = cleanFreeText(typeof nameRaw === 'string' ? nameRaw : '', 80);
  if (!name) return undefined;
  return { method, name };
};

export const optionalText = (raw, maxLength) => {
  if (raw === undefined || raw === null || raw === '') return '';
  const cleaned = cleanFreeText(raw, maxLength);
  return cleaned === null ? undefined : cleaned;
};
