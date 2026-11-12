import { describe, it, expect } from 'vitest';
import { buildTotals, repaidMinorOf } from '../../src/utils/balanceTotals.js';

describe('repaidMinorOf', () => {
  const loan = (paid, amount, direction = 'borrowed') => ({ direction, paid, amount });
  it('counts the repaid share of money someone else paid', () => {
    expect(repaidMinorOf({ paidBy: 'other', amountMinor: 10000 }, loan(50, 200))).toBe(2500);
  });
  it('is zero for my own spending, lent loans, and missing loans', () => {
    expect(repaidMinorOf({ paidBy: 'self', amountMinor: 10000 }, loan(50, 200))).toBe(0);
    expect(repaidMinorOf({ paidBy: 'other', amountMinor: 10000 }, loan(50, 200, 'lent'))).toBe(0);
    expect(repaidMinorOf({ paidBy: 'other', amountMinor: 10000 }, null)).toBe(0);
    expect(repaidMinorOf({ paidBy: 'other', amountMinor: 10000 }, loan(0, 0))).toBe(0);
  });
  it('never goes above the full amount', () => {
    expect(repaidMinorOf({ paidBy: 'other', amountMinor: 10000 }, loan(500, 200))).toBe(10000);
  });
});

describe('buildTotals', () => {
  it('splits self and other per month and currency, sorted by month', () => {
    const rows = buildTotals([
      { _id: { month: '2026-11', currency: 'PKR', paidBy: 'self' }, minor: 5000 },
      { _id: { month: '2026-10', currency: 'PKR', paidBy: 'other' }, minor: 3000 },
      { _id: { month: '2026-11', currency: 'USD', paidBy: 'self' }, minor: 100 },
    ]);
    expect(rows.map((row) => `${row.month}|${row.currency}`)).toEqual(['2026-10|PKR', '2026-11|PKR', '2026-11|USD']);
    expect(rows[0]).toMatchObject({ selfMinor: 0, otherMinor: 3000 });
  });
  it('caps repaid at what others paid', () => {
    const rows = buildTotals(
      [{ _id: { month: '2026-11', currency: 'PKR', paidBy: 'other' }, minor: 1000 }],
      new Map([['2026-11|PKR', 5000]])
    );
    expect(rows[0].repaidMinor).toBe(1000);
  });
});
