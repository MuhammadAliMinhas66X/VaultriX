import { estimateTax, taxRuleForCurrency } from './taxRules.js';

export const PERIODS_PER_YEAR = { daily: 365, weekly: 52, monthly: 12, yearly: 1 };

export const supportsCuts = (stream) =>
  stream.incomeType === 'salaried' && stream.expectedAmount !== null && stream.expectedAmount > 0 && Boolean(PERIODS_PER_YEAR[stream.frequency]);

export const supportsTax = (stream) => supportsCuts(stream) && Boolean(taxRuleForCurrency(stream.currency));

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const divide = (lines, by) => lines.map((line) => ({ name: line.name, amount: line.amount / by }));

export const calculateCuts = (stream) => {
  const periods = PERIODS_PER_YEAR[stream.frequency];
  const gross = stream.expectedAmount * periods;
  const rule = stream.taxEnabled && supportsTax(stream) ? taxRuleForCurrency(stream.currency) : null;
  const estimate = rule ? estimateTax(rule, gross) : { tax: 0, contributions: [] };

  const deductions = stream.deductionsEnabled
    ? (stream.deductions || []).map((item) => ({
        name: item.name,
        amount: item.kind === 'percent' ? (gross * Math.min(number(item.value), 100)) / 100 : number(item.value) * periods,
      }))
    : [];

  const sum = (lines) => lines.reduce((total, line) => total + line.amount, 0);
  const cuts = estimate.tax + sum(estimate.contributions) + sum(deductions);
  const net = Math.max(0, gross - cuts);

  return {
    yearly: { gross, tax: estimate.tax, contributions: estimate.contributions, deductions, cuts, net },
    monthly: {
      gross: gross / 12,
      tax: estimate.tax / 12,
      contributions: divide(estimate.contributions, 12),
      deductions: divide(deductions, 12),
      cuts: cuts / 12,
      net: net / 12,
    },
    netPerPeriod: net / periods,
    hasCuts: cuts > 0,
  };
};

export const amountForTotal = (stream) =>
  stream.deductFromTotal && supportsCuts(stream) ? calculateCuts(stream).netPerPeriod : stream.expectedAmount;

export const isDeducted = (stream) => supportsCuts(stream) && Boolean(stream.deductFromTotal) && calculateCuts(stream).hasCuts;
