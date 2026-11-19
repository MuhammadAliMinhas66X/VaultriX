import { sumReceipts, sumSpent, convert } from './balanceMath.js';
import { shiftMonth, monthKey } from './expenseMath.js';

const MAX_MONTHS = 36;

// What was left of each month's income, from the month of the first income received up to this month.
// The money left over is "kept": a month that was overspent keeps 0 (it never takes away what you saved).
// month: 'YYYY-MM', newest first.
export const monthlyKept = ({ receipts, streams, totals, rates, base, now = new Date() }) => {
  const current = monthKey(now);
  const first = receipts.reduce((min, receipt) => {
    const month = String(receipt.receivedAt).slice(0, 7);
    return !min || month < min ? month : min;
  }, '');
  if (!first) return [];
  const streamsById = new Map(streams.map((stream) => [stream.id, stream]));
  const rows = [];
  let month = first;
  while (month <= current && rows.length < MAX_MONTHS * 2) {
    const income = sumReceipts(receipts, streamsById, rates, base, { month }).net;
    const spent = sumSpent(totals, rates, base, { month }).spentSelf;
    rows.push({ month, income, spent, kept: Math.max(0, income - spent), open: month === current });
    month = shiftMonth(month, 1);
  }
  return rows.slice(-MAX_MONTHS).reverse();
};

// Manual entries in the base currency (put in positive, taken out negative).
export const manualTotal = (entries, rates, base) => {
  let total = 0;
  entries.forEach((entry) => {
    const value = convert(entry.amount, entry.currency, rates, base);
    if (value !== null) total += value;
  });
  return total;
};

export const savedSummary = (rows, entries, rates, base) => {
  const auto = rows.reduce((sum, row) => sum + row.kept, 0);
  const manual = manualTotal(entries, rates, base);
  return { auto, manual, total: auto + manual };
};
