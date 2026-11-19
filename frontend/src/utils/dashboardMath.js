import { daysInMonth } from './expenseMath.js';
import { toBase } from './incomeMath.js';
import { buildReminders } from './reminders.js';

const EPSILON = 0.004;

// Where the month stands today. `spent` is what I paid myself this month and
// `left` is received minus spent (both from useBalance). todayKey: YYYY-MM-DD.
export const paceStats = ({ spent, left, todayKey }) => {
  const size = daysInMonth(todayKey.slice(0, 7));
  const day = Math.min(size, Math.max(1, Number(todayKey.slice(8, 10))));
  const daysLeft = size - day + 1;
  const perDay = spent / day;
  return {
    day,
    size,
    daysLeft,
    elapsed: day / size,
    perDay,
    projected: perDay * size,
    safePerDay: left > EPSILON ? left / daysLeft : 0,
  };
};

// Whole-number change versus a previous value. null when there is nothing to compare.
export const changePercent = (current, previous) => (previous > EPSILON ? Math.round(((current - previous) / previous) * 100) : null);

// Money still open on loans, in the base currency. Borrowed = I owe it,
// anything else = it is owed to me. Loans without a rate are counted as excluded.
export const loanTotals = (loans, rates, base) => {
  const open = (loans || []).filter((loan) => !loan.done && loan.remaining > EPSILON);
  const sum = (list) => {
    let total = 0;
    let excluded = 0;
    list.forEach((loan) => {
      const value = loan.currency === base ? loan.remaining : toBase(loan.remaining, loan.currency, rates);
      if (value === null || value === undefined) excluded += 1;
      else total += value;
    });
    return { total, count: list.length, excluded };
  };
  return {
    owedToMe: sum(open.filter((loan) => loan.direction !== 'borrowed')),
    iOwe: sum(open.filter((loan) => loan.direction === 'borrowed')),
  };
};

// One ordered list of what needs attention now. Overdue and over-budget first.
// Item: { key, kind, name, amount, currency, days, ratio, href } where kind is
// bill | loanOwe | loanOwed | budgetOver | budgetWarn | overspent.
export const attentionItems = ({ bills, loans, budgetRows, overspent, today, limit = 5 }) => {
  const items = [];

  if (overspent > EPSILON) items.push({ key: 'overspent', kind: 'overspent', amount: overspent, days: -1000, href: '/expenses' });

  buildReminders(bills, loans, today).forEach((item) => items.push({ ...item, href: item.href }));

  (budgetRows || []).forEach((row) => {
    if (row.status === 'ok') return;
    items.push({
      key: `budget-${row.id || row.categoryId}`,
      kind: row.status === 'over' ? 'budgetOver' : 'budgetWarn',
      categoryId: row.categoryId,
      amount: row.status === 'over' ? row.spent - row.limit : row.left,
      ratio: row.ratio,
      days: row.status === 'over' ? -500 : 0.5,
      href: '/reports?tab=budgets',
    });
  });

  return items.sort((a, b) => a.days - b.days).slice(0, limit);
};

// Latest money I paid out myself, newest first.
export const recentSpending = (expenses, limit = 5) =>
  [...(expenses || [])]
    .filter((expense) => expense.paidBy !== 'other')
    .sort((a, b) => String(b.spentAt).localeCompare(String(a.spentAt)) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, limit);

// One word for how the month is going. projected = where today's pace ends the month.
export const paceVerdict = ({ received, spent, left, projected }) => {
  if (left < -0.005) return 'over';
  if (received <= 0.005) return 'noIncome';
  if (spent <= 0.005) return 'noSpend';
  if (projected > received) return 'fast';
  if (projected > received * 0.9) return 'close';
  return 'good';
};
