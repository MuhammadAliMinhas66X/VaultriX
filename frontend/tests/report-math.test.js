import { describe, it, expect } from 'vitest';
import { budgetRows, goalProgress, buildTrend, monthsEndingAt, savingsRate, toCsv } from '../src/utils/reportMath.js';

const rates = { PKR: 1, USD: 0.0036 };

describe('report math', () => {
  it('lists months oldest first', () => {
    expect(monthsEndingAt('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });
  it('rates savings', () => {
    expect(savingsRate(1000, 750)).toBe(25);
    expect(savingsRate(0, 10)).toBeNull();
  });
  it('flags budgets near and over the limit and ignores money others paid', () => {
    const budgets = [{ id: 'b1', categoryId: 'food', amount: 1000, currency: 'PKR' }, { id: 'b2', categoryId: 'fun', amount: 1000, currency: 'PKR' }];
    const expenses = [
      { categoryId: 'food', amount: 850, currency: 'PKR', paidBy: 'self' },
      { categoryId: 'fun', amount: 1200, currency: 'PKR', paidBy: 'self' },
      { categoryId: 'fun', amount: 5000, currency: 'PKR', paidBy: 'other' },
    ];
    const rows = budgetRows(budgets, expenses, rates, 'PKR');
    expect(rows.map((row) => [row.categoryId, row.status])).toEqual([['fun', 'over'], ['food', 'warn']]);
  });
  it('works out goal progress and the monthly need', () => {
    const p = goalProgress({ target: 1200, saved: 200, deadline: '2027-01-01' }, '2026-01-01');
    expect(p.left).toBe(1000);
    expect(p.perMonth).toBeCloseTo(1000 / 12, 0);
    expect(goalProgress({ target: 100, saved: 100, deadline: null }, '2026-01-01').done).toBe(true);
    expect(goalProgress({ target: 100, saved: 10, deadline: '2025-01-01' }, '2026-01-01').overdue).toBe(true);
  });
  it('builds a trend from receipts and totals', () => {
    const trend = buildTrend({
      receipts: [{ streamId: 's', receivedAt: '2026-03-05', amount: 1000, currency: 'PKR' }],
      streams: [{ id: 's', currency: 'PKR' }],
      totals: [{ month: '2026-03', currency: 'PKR', self: 300, other: 0, repaid: 0 }],
      rates, base: 'PKR', end: '2026-03', count: 2,
    });
    expect(trend[1]).toMatchObject({ month: '2026-03', income: 1000, spent: 300 });
  });
  it('protects csv cells from formulas', () => {
    expect(toCsv([['=SUM(A1)', 'a,b']])).toBe("'=SUM(A1),\"a,b\"");
  });
});
