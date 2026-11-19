import { describe, it, expect } from 'vitest';
import { paceVerdict, paceStats, changePercent, loanTotals, attentionItems, recentSpending } from '../src/utils/dashboardMath.js';

describe('paceStats', () => {
  it('projects the month and a safe daily amount', () => {
    const pace = paceStats({ spent: 300, left: 700, todayKey: '2026-11-10' });
    expect(pace.size).toBe(30);
    expect(pace.day).toBe(10);
    expect(pace.daysLeft).toBe(21);
    expect(pace.perDay).toBe(30);
    expect(pace.projected).toBe(900);
    expect(pace.safePerDay).toBeCloseTo(700 / 21);
  });

  it('has no safe amount when nothing is left', () => {
    expect(paceStats({ spent: 100, left: -5, todayKey: '2026-11-30' }).safePerDay).toBe(0);
  });
});

describe('changePercent', () => {
  it('compares to the previous value', () => {
    expect(changePercent(150, 100)).toBe(50);
    expect(changePercent(50, 100)).toBe(-50);
    expect(changePercent(10, 0)).toBeNull();
  });
});

describe('loanTotals', () => {
  const rates = { PKR: 280 };
  it('splits open loans by direction and skips finished ones', () => {
    const loans = [
      { remaining: 100, currency: 'USD', direction: 'lent', done: false },
      { remaining: 2800, currency: 'PKR', direction: 'borrowed', done: false },
      { remaining: 50, currency: 'USD', direction: 'lent', done: true },
    ];
    const totals = loanTotals(loans, rates, 'USD');
    expect(totals.owedToMe).toEqual({ total: 100, count: 1, excluded: 0 });
    expect(totals.iOwe.total).toBeCloseTo(10);
    expect(totals.iOwe.count).toBe(1);
  });
});

describe('attentionItems', () => {
  it('puts overspending and overdue things first and keeps ok budgets out', () => {
    const bills = [{ id: 'b1', billerName: 'Power', dueAt: '2026-11-15', remaining: 40, currency: 'USD', payments: [], cancelledAt: null }];
    const budgetRows = [
      { id: 'x', categoryId: 'c1', status: 'over', spent: 120, limit: 100, ratio: 1.2, left: -20 },
      { id: 'y', categoryId: 'c2', status: 'ok', spent: 10, limit: 100, ratio: 0.1, left: 90 },
    ];
    const items = attentionItems({ bills, loans: [], budgetRows, overspent: 25, today: '2026-11-18' });
    expect(items.map((item) => item.kind)).toEqual(['overspent', 'budgetOver', 'bill']);
    expect(items[1].amount).toBe(20);
  });
});

describe('recentSpending', () => {
  it('returns my own newest expenses only', () => {
    const list = [
      { id: 1, spentAt: '2026-11-01', paidBy: 'self' },
      { id: 2, spentAt: '2026-11-05', paidBy: 'other' },
      { id: 3, spentAt: '2026-11-03', paidBy: 'self' },
    ];
    expect(recentSpending(list, 5).map((item) => item.id)).toEqual([3, 1]);
  });
});

describe('paceVerdict', () => {
  it('names how the month is going', () => {
    expect(paceVerdict({ received: 100, spent: 150, left: -50, projected: 300 })).toBe('over');
    expect(paceVerdict({ received: 0, spent: 0, left: 0, projected: 0 })).toBe('noIncome');
    expect(paceVerdict({ received: 100, spent: 0, left: 100, projected: 0 })).toBe('noSpend');
    expect(paceVerdict({ received: 100, spent: 40, left: 60, projected: 130 })).toBe('fast');
    expect(paceVerdict({ received: 100, spent: 30, left: 70, projected: 95 })).toBe('close');
    expect(paceVerdict({ received: 100, spent: 20, left: 80, projected: 60 })).toBe('good');
  });
});
