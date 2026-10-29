import { toBase } from './incomeMath.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const CRITICAL_DAYS = 7;

export const utcDayNumber = (value) => {
  const date = new Date(value);
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS);
};

export const todayDayNumber = () => {
  const now = new Date();
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
};

export const dayNumberToDate = (day) => new Date(day * DAY_MS);

export const loanState = (loan, today = todayDayNumber()) => {
  const daysLeft = loan.dueAt ? utcDayNumber(loan.dueAt) - today : null;
  const done = Boolean(loan.done);
  const overdue = !done && daysLeft !== null && daysLeft < 0;
  const dueSoon = !done && daysLeft !== null && daysLeft >= 0 && daysLeft <= CRITICAL_DAYS;
  return {
    done,
    open: !done,
    daysLeft,
    overdue,
    dueSoon,
    critical: overdue || dueSoon,
    progress: loan.amount > 0 ? Math.min(1, loan.paid / loan.amount) : 0,
  };
};

export const FILTERS = ['all', 'open', 'done', 'critical'];

export const matchesFilter = (loan, filter, today) => {
  const state = loanState(loan, today);
  if (filter === 'open') return state.open;
  if (filter === 'done') return state.done;
  if (filter === 'critical') return state.critical;
  return true;
};

export const countByFilter = (loans, today = todayDayNumber()) =>
  FILTERS.reduce((acc, filter) => ({ ...acc, [filter]: loans.filter((loan) => matchesFilter(loan, filter, today)).length }), {});

export const sortLoans = (loans, filter, today = todayDayNumber()) => {
  const list = [...loans];
  if (filter === 'critical') {
    return list.sort((a, b) => loanState(a, today).daysLeft - loanState(b, today).daysLeft);
  }
  return list.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt) || new Date(b.createdAt) - new Date(a.createdAt));
};

export const summarizeLoans = (loans, rates, baseCurrency) => {
  let total = 0;
  let paid = 0;
  let left = 0;
  let excluded = 0;
  loans.forEach((loan) => {
    const same = loan.currency === baseCurrency;
    const convert = (value) => (same ? value : toBase(value, loan.currency, rates));
    const totalBase = convert(loan.amount);
    if (totalBase === null) {
      excluded += 1;
      return;
    }
    total += totalBase;
    paid += convert(loan.paid);
    left += convert(loan.remaining);
  });
  return { total, paid, left, excluded };
};

export const balanceSeries = (loan, today = todayDayNumber()) => {
  const startDay = utcDayNumber(loan.sentAt);
  const dueDay = loan.dueAt ? utcDayNumber(loan.dueAt) : null;
  const points = [{ day: startDay, balance: loan.amount }];
  let balance = loan.amount;
  loan.payments.forEach((payment) => {
    balance = Math.max(0, Math.round((balance - payment.amount) * 100) / 100);
    points.push({ day: Math.max(startDay, utcDayNumber(payment.paidAt)), balance, payment });
  });
  const lastDay = points[points.length - 1].day;
  let endDay = loan.done ? Math.max(lastDay, dueDay ?? 0) : Math.max(today, dueDay ?? 0, lastDay);
  if (endDay <= startDay) endDay = startDay + 1;
  return { points, startDay, endDay, dueDay, today };
};
