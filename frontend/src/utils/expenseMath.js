import { toBase } from './incomeMath.js';

export const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const shiftMonth = (key, delta) => {
  const [year, month] = key.split('-').map(Number);
  return monthKey(new Date(year, month - 1 + delta, 1));
};

export const daysInMonth = (key) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};

export const dayKey = (value) => String(value).slice(0, 10);

export const shiftDay = (key, delta) => {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
};

export const convertAmount = (expense, rates, baseCurrency) =>
  expense.currency === baseCurrency ? expense.amount : toBase(expense.amount, expense.currency, rates);

export const sumExpenses = (expenses, rates, baseCurrency) => {
  let total = 0;
  let excluded = 0;
  expenses.forEach((expense) => {
    const value = convertAmount(expense, rates, baseCurrency);
    if (value === null) excluded += 1;
    else total += value;
  });
  return { total, excluded };
};

export const analyze = (expenses, previous, month, todayKey, rates, baseCurrency) => {
  const size = daysInMonth(month);
  const days = Array.from({ length: size }, (_, index) => ({ day: index + 1, amount: 0 }));
  const byCategory = new Map();
  let total = 0;
  let excluded = 0;
  let biggest = null;

  expenses.forEach((expense) => {
    const value = convertAmount(expense, rates, baseCurrency);
    if (value === null) {
      excluded += 1;
      return;
    }
    const slot = days[Number(dayKey(expense.spentAt).slice(8, 10)) - 1];
    if (!slot) return;
    total += value;
    slot.amount += value;
    const key = expense.categoryId || 'none';
    byCategory.set(key, (byCategory.get(key) || 0) + value);
    if (!biggest || value > biggest.value) biggest = { value, expense };
  });

  let top = null;
  byCategory.forEach((value, key) => {
    if (!top || value > top.value) top = { key, value };
  });

  const current = todayKey.slice(0, 7) === month;
  const elapsed = current ? Number(todayKey.slice(8, 10)) : todayKey.slice(0, 7) < month ? 0 : size;
  const prevTotal = sumExpenses(previous, rates, baseCurrency).total;

  return {
    total,
    excluded,
    days,
    top,
    biggest,
    perDay: elapsed > 0 ? total / elapsed : 0,
    change: prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null,
  };
};

export const breakdown = (expenses, rates, baseCurrency) => {
  const map = new Map();
  let total = 0;
  expenses.forEach((expense) => {
    const value = convertAmount(expense, rates, baseCurrency);
    if (value === null) return;
    const key = expense.categoryId || 'none';
    const row = map.get(key) || { key, value: 0, count: 0 };
    row.value += value;
    row.count += 1;
    total += value;
    map.set(key, row);
  });
  return [...map.values()]
    .sort((a, b) => b.value - a.value)
    .map((row) => ({ ...row, share: total > 0 ? row.value / total : 0 }));
};
