import { describe, it, expect } from 'vitest';
import { comparePlan, monthlyNet } from '../src/utils/salaryPlanMath.js';

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
  });
});
