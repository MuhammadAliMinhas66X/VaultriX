import { annualTax } from './fbrTax.js';

export const PERIODS_PER_YEAR = { daily: 365, weekly: 52, monthly: 12, yearly: 1 };

export const supportsCuts = (stream) =>
  stream.incomeType === 'salaried' &&
  stream.expectedAmount !== null &&
  stream.expectedAmount > 0 &&
  Boolean(PERIODS_PER_YEAR[stream.frequency]);

export const supportsTax = (stream) => supportsCuts(stream) && stream.currency === 'PKR';

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const calculateCuts = (stream) => {
  const periods = PERIODS_PER_YEAR[stream.frequency];
  const gross = stream.expectedAmount * periods;
  const tax = stream.taxEnabled && supportsTax(stream) ? annualTax(gross) : 0;
  const deductions = stream.deductionsEnabled
    ? (stream.deductions || []).map((item) => ({
        name: item.name,
        amount: item.kind === 'percent' ? (gross * Math.min(number(item.value), 100)) / 100 : number(item.value) * periods,
      }))
    : [];
  const deductionsTotal = deductions.reduce((sum, item) => sum + item.amount, 0);
  const cuts = tax + deductionsTotal;
  const net = Math.max(0, gross - cuts);

  return {
    yearly: { gross, tax, deductions, cuts, net },
    monthly: {
      gross: gross / 12,
      tax: tax / 12,
      deductions: deductions.map((item) => ({ name: item.name, amount: item.amount / 12 })),
      cuts: cuts / 12,
      net: net / 12,
    },
    netPerPeriod: net / periods,
    hasCuts: cuts > 0,
  };
};

export const amountForTotal = (stream) =>
  stream.deductFromTotal && supportsCuts(stream) ? calculateCuts(stream).netPerPeriod : stream.expectedAmount;
