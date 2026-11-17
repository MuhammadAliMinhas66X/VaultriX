import { PERIODS_PER_YEAR, supportsCuts, calculateCuts } from './salaryCuts.js';
import { convertAmount } from './expenseMath.js';

// What a stream brings in per month after tax and deductions.
export const monthlyNet = (stream) => {
  if (!stream || !(stream.expectedAmount > 0)) return 0;
  if (supportsCuts(stream)) return calculateCuts(stream).monthly.net;
  const periods = PERIODS_PER_YEAR[stream.frequency];
  return periods ? (stream.expectedAmount * periods) / 12 : stream.expectedAmount;
};

const round2 = (value) => Math.round(value * 100) / 100;

// Plan against reality. `lines` = [{id,label,amount,categoryId}], `expenses` = this month's,
// everything is shown in `currency`.
export const comparePlan = ({ income, lines, expenses, rates, currency }) => {
  const spentByCategory = new Map();
  let spent = 0;
  expenses.forEach((expense) => {
    // money someone else paid is not mine until repaid
    if (expense.paidBy === 'other') return;
    const value = convertAmount(expense, rates, currency);
    if (value === null || value === undefined) return;
    spent += value;
    const key = expense.categoryId || 'none';
    spentByCategory.set(key, (spentByCategory.get(key) || 0) + value);
  });
  const tracked = new Set(lines.filter((line) => line.categoryId).map((line) => line.categoryId));
  const rows = lines.map((line) => ({
    ...line,
    spent: line.categoryId ? round2(spentByCategory.get(line.categoryId) || 0) : null,
  }));
  let outside = 0;
  spentByCategory.forEach((value, key) => {
    if (!tracked.has(key)) outside += value;
  });
  const planned = round2(lines.reduce((sum, line) => sum + line.amount, 0));
  const covered = rows.reduce((sum, line) => sum + (line.spent === null ? line.amount : Math.max(line.amount, line.spent)), 0);
  const committed = round2(covered + outside);
  return {
    committed,
    saving: round2(income - committed),
    rows,
    planned,
    spent: round2(spent),
    outside: round2(outside),
    leftToPlan: round2(income - planned),
    leftNow: round2(income - spent),
  };
};

export const spentInMonth = (totals, month, rates, currency) => {
  let sum = 0;
  (totals || []).forEach((row) => {
    if (row.month !== month || !(row.self > 0)) return;
    const value = convertAmount({ amount: row.self, currency: row.currency }, rates, currency);
    if (value !== null && value !== undefined) sum += value;
  });
  return round2(sum);
};
