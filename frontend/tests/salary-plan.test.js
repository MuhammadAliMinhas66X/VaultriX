import { describe, it, expect } from 'vitest';
import { comparePlan, monthlyNet, spentInMonth } from '../src/utils/salaryPlanMath.js';

describe('salary plan maths', () => {
  it('turns a weekly or monthly amount into a monthly figure', () => {
    expect(monthlyNet({ expectedAmount: 100000, frequency: 'monthly', incomeType: 'business', currency: 'PKR' })).toBe(100000);
    expect(monthlyNet({ expectedAmount: 1200, frequency: 'weekly', incomeType: 'business', currency: 'PKR' })).toBeCloseTo(5200, 5);
    expect(monthlyNet(null)).toBe(0);
  });

  it('compares planned lines with real spending, ignoring money others paid', () => {
    const result = comparePlan({
      income: 100000,
      currency: 'PKR',
      rates: { PKR: 1 },
      lines: [{ id: 'a', label: 'Food', amount: 20000, categoryId: 'food' }, { id: 'b', label: 'Rent', amount: 40000, categoryId: null }],
      expenses: [
        { amount: 5000, currency: 'PKR', categoryId: 'food', paidBy: 'self' },
        { amount: 2500, currency: 'PKR', categoryId: 'food', paidBy: 'self' },
        { amount: 9000, currency: 'PKR', categoryId: 'fun', paidBy: 'self' },
        { amount: 7000, currency: 'PKR', categoryId: 'food', paidBy: 'other' },
      ],
    });
    expect(result.planned).toBe(60000);
    expect(result.spent).toBe(16500);
    expect(result.rows[0].spent).toBe(7500);
    expect(result.rows[1].spent).toBeNull();
    expect(result.outside).toBe(9000);
    expect(result.leftToPlan).toBe(40000);
    expect(result.leftNow).toBe(83500);
    expect(result.committed).toBe(69000);
    expect(result.saving).toBe(31000);
  });

  it('counts a line at what was spent when spending went past the plan', () => {
    const result = comparePlan({
      income: 50000,
      currency: 'PKR',
      rates: { PKR: 1 },
      lines: [{ id: 'a', label: 'Food', amount: 10000, categoryId: 'food' }],
      expenses: [{ amount: 14000, currency: 'PKR', categoryId: 'food', paidBy: 'self' }],
    });
    expect(result.committed).toBe(14000);
    expect(result.saving).toBe(36000);
  });

  it('adds up what was spent in one month across currencies', () => {
    const totals = [
      { month: '2026-10', currency: 'PKR', self: 30000, other: 0, repaid: 0 },
      { month: '2026-10', currency: 'USD', self: 10, other: 0, repaid: 0 },
      { month: '2026-09', currency: 'PKR', self: 99999, other: 0, repaid: 0 },
    ];
    expect(spentInMonth(totals, '2026-10', { PKR: 1, USD: 0.01 }, 'PKR')).toBe(31000);
    expect(spentInMonth(totals, '2026-08', { PKR: 1 }, 'PKR')).toBe(0);
  });
});
