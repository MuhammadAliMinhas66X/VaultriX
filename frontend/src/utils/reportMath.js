import { sumReceipts, sumSpent, convert } from './balanceMath.js';
import { shiftMonth, convertAmount, dayKey } from './expenseMath.js';

// Month keys ending at `end`, oldest first.
export const monthsEndingAt = (end, count) => Array.from({ length: count }, (_, index) => shiftMonth(end, index - (count - 1)));

// Income received (after deductions) and money I paid out, for each month.
export const buildTrend = ({ receipts, streams, totals, rates, base, end, count = 6 }) => {
  const streamsById = new Map(streams.map((stream) => [stream.id, stream]));
  return monthsEndingAt(end, count).map((month) => {
    const income = sumReceipts(receipts, streamsById, rates, base, { month }).net;
    const spent = sumSpent(totals, rates, base, { month }).spentSelf;
    return { month, income, spent };
  });
};

export const savingsRate = (income, spent) => (income > 0 ? Math.round(((income - spent) / income) * 100) : null);

// Money I spent on a category this month (things others paid for do not count).
export const spentByCategory = (expenses, rates, base) => {
  const map = new Map();
  expenses.forEach((expense) => {
    if (expense.paidBy === 'other') return;
    const value = convertAmount(expense, rates, base);
    if (value === null) return;
    const key = expense.categoryId || 'none';
    map.set(key, (map.get(key) || 0) + value);
  });
  return map;
};

export const BUDGET_WARN = 0.8;

export const budgetRows = (budgets, expenses, rates, base) => {
  const spentMap = spentByCategory(expenses, rates, base);
  return budgets
    .map((budget) => {
      const limit = convert(budget.amount, budget.currency, rates, base);
      if (limit === null || !(limit > 0)) return null;
      const spent = spentMap.get(budget.categoryId) || 0;
      const ratio = spent / limit;
      return { ...budget, limit, spent, ratio, left: limit - spent, status: ratio > 1 ? 'over' : ratio >= BUDGET_WARN ? 'warn' : 'ok' };
    })
    .filter(Boolean)
    .sort((a, b) => b.ratio - a.ratio);
};

export const budgetTotals = (rows) => {
  const limit = rows.reduce((sum, row) => sum + row.limit, 0);
  const spent = rows.reduce((sum, row) => sum + row.spent, 0);
  return { limit, spent, ratio: limit > 0 ? spent / limit : 0 };
};

const MS_DAY = 24 * 60 * 60 * 1000;

// today: 'YYYY-MM-DD'. Works in the goal's own currency.
export const goalProgress = (goal, today) => {
  const ratio = goal.target > 0 ? Math.min(1, Math.max(0, goal.saved / goal.target)) : 0;
  const left = Math.max(0, goal.target - goal.saved);
  const done = goal.saved >= goal.target;
  let daysLeft = null;
  let perMonth = null;
  let overdue = false;
  if (goal.deadline) {
    daysLeft = Math.round((new Date(`${goal.deadline}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / MS_DAY);
    overdue = daysLeft < 0 && !done;
    if (!done && daysLeft >= 0) perMonth = left / Math.max(1, Math.ceil(daysLeft / 30.44));
  }
  return { ratio, left, done, daysLeft, perMonth, overdue };
};

const csvCell = (value) => {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const toCsv = (rows) => rows.map((row) => row.map(csvCell).join(',')).join('\r\n');

export const expenseRows = (expenses, categoryName, header) => [
  header,
  ...[...expenses]
    .sort((a, b) => dayKey(a.spentAt).localeCompare(dayKey(b.spentAt)))
    .map((expense) => [dayKey(expense.spentAt), categoryName(expense.categoryId), expense.note || '', expense.amount, expense.currency]),
];
