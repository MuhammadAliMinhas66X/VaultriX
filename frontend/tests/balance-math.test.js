import { describe, it, expect } from 'vitest';
import { computeBalance, receiptAmounts, sumSpent } from '../src/utils/balanceMath.js';

const rates = { PKR: 1, USD: 0.0036 }; // units per 1 PKR (base = PKR)
const base = 'PKR';
const stream = { id: 's1', currency: 'PKR', incomeType: 'salaried', frequency: 'monthly', expectedAmount: 100000, deductionsEnabled: true, deductFromTotal: true, deductions: [{ name: 'Fund', kind: 'percent', value: 10 }] };
const receipt = (id, day, amount, extra = {}) => ({ id, streamId: 's1', receivedAt: `${day}T00:00:00.000Z`, amount, currency: 'PKR', ...extra });
const row = (month, self, other = 0, repaid = 0, currency = 'PKR') => ({ month, currency, self, other, repaid });

describe('balance', () => {
  it('adds every receipt, so a second salary counts', () => {
    const result = computeBalance({ opening: null, receipts: [receipt('a', '2026-10-01', 100000), receipt('b', '2026-11-01', 100000)], streams: [{ ...stream, deductFromTotal: false }], totals: [], rates, base, month: '2026-11' });
    expect(result.running).toBe(200000);
    expect(result.month.received).toBe(100000);
  });

  it('subtracts spending from earlier months too', () => {
    const result = computeBalance({ opening: null, receipts: [receipt('a', '2026-10-01', 100000)], streams: [{ ...stream, deductFromTotal: false }], totals: [row('2026-10', 30000), row('2026-11', 5000)], rates, base, month: '2026-11' });
    expect(result.running).toBe(65000);
    expect(result.month.left).toBe(-5000);
    expect(result.overspentMonth).toBe(true);
    expect(result.belowZero).toBe(false);
  });

  it('takes the stream deductions off each receipt', () => {
    expect(receiptAmounts(receipt('a', '2026-11-01', 100000), stream).net).toBeLessThan(100000);
    const result = computeBalance({ opening: null, receipts: [receipt('a', '2026-11-01', 100000)], streams: [stream], totals: [], rates, base, month: '2026-11' });
    expect(result.income.cuts).toBeGreaterThan(0);
    expect(result.running).toBeCloseTo(result.income.net, 5);
  });

  it('starts from the opening balance and ignores older receipts and spending', () => {
    const opening = { amount: 50000, currency: 'PKR', asOf: '2026-11-01' };
    const result = computeBalance({ opening, receipts: [receipt('old', '2026-10-15', 999999), receipt('new', '2026-11-02', 10000)], streams: [{ ...stream, deductFromTotal: false }], totals: [row('2026-11', 4000)], rates, base, month: '2026-11' });
    expect(result.running).toBe(56000);
  });

  it('converts other currencies with the given rate and leaves out ones with no rate', () => {
    const result = computeBalance({ opening: null, receipts: [receipt('usd', '2026-11-01', 36, { currency: 'USD' }), receipt('xx', '2026-11-01', 5, { currency: 'ZZZ' })], streams: [], totals: [], rates, base, month: '2026-11' });
    expect(result.running).toBeCloseTo(10000, 5);
    expect(result.excluded).toBe(1);
  });

  it('money others paid leaves the balance only once paid back', () => {
    const spent = sumSpent([row('2026-11', 1000, 4000, 1000)], rates, base);
    expect(spent.spentAll).toBe(5000);
    expect(spent.spentSelf).toBe(2000);
  });

  it('is zero with nothing recorded', () => {
    const result = computeBalance({ opening: null, receipts: [], streams: [], totals: [], rates, base, month: '2026-11' });
    expect(result.running).toBe(0);
    expect(result.month.left).toBe(0);
  });
});
