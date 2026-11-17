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

// Savings is its own allocation kind. Lines saved with `kind: 'savings'` are savings. Lines saved
// before the kind existed have no kind, so they count as savings only when named like it.
const SAVINGS_NAMES = new Set(['savings', 'saving', 'my savings']);
export const isSavingsLine = (line) => {
  if (!line) return false;
  if (line.kind === 'savings') return true;
  if (line.kind === 'spend') return false;
  return SAVINGS_NAMES.has(String(line.label || '').trim().toLowerCase());
};

const pct = (part, whole) => (whole > 0 ? round2((part / whole) * 100) : 0);

// Planned money only: salary, what is allocated (and how much of that is savings), what is unallocated.
// Real spending is deliberately not part of this; `comparePlan` covers that.
export const summarizeAllocations = (salary, lines) => {
  const total = round2(Number(salary) > 0 ? Number(salary) : 0);
  const list = lines || [];
  const allocated = round2(list.reduce((sum, line) => sum + line.amount, 0));
  const savings = round2(list.filter(isSavingsLine).reduce((sum, line) => sum + line.amount, 0));
  const unallocated = round2(total - allocated);
  const allocatedPercent = pct(allocated, total);
  return {
    salary: total,
    allocated,
    savings,
    other: round2(allocated - savings),
    unallocated,
    over: unallocated < 0,
    allocatedPercent,
    unallocatedPercent: total > 0 ? round2(100 - allocatedPercent) : 0,
    savingsPercent: pct(savings, total),
  };
};
