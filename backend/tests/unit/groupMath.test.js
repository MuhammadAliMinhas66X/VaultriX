import { describe, it, expect } from 'vitest';
import { splitByPercent, splitEqual, computeBalances, suggestTransfers } from '../../src/utils/groupMath.js';

describe('group maths', () => {
  it('splits so the parts always add up', () => {
    const parts = splitEqual(1000, ['a', 'b', 'c']);
    expect(parts.map((p) => p.amountMinor)).toEqual([334, 333, 333]);
    expect(parts.reduce((s, p) => s + p.amountMinor, 0)).toBe(1000);
    expect(splitEqual(5, ['a', 'b']).map((p) => p.amountMinor)).toEqual([3, 2]);
    expect(splitEqual(10, [])).toEqual([]);
  });

  it('works out who is owed and who owes', () => {
    // Ali pays rent 30000, split three ways; Sara pays food 6000 split three ways.
    const rent = { currency: 'PKR', paidBy: 'ali', amountMinor: 30000, shares: splitEqual(30000, ['ali', 'sara', 'bilal']) };
    const food = { currency: 'PKR', paidBy: 'sara', amountMinor: 6000, shares: splitEqual(6000, ['ali', 'sara', 'bilal']) };
    const balances = computeBalances([rent, food], []).PKR;
    expect(balances).toEqual({ ali: 30000 - 10000 - 2000, sara: 6000 - 10000 - 2000 + 0, bilal: -12000 });
    expect(Object.values(balances).reduce((s, v) => s + v, 0)).toBe(0);
  });

  it('settlements bring balances back to zero', () => {
    const expense = { currency: 'PKR', paidBy: 'ali', amountMinor: 3000, shares: splitEqual(3000, ['ali', 'sara']) };
    const settle = { currency: 'PKR', fromUserId: 'sara', toUserId: 'ali', amountMinor: 1500 };
    const balances = computeBalances([expense], [settle]).PKR;
    expect(balances.ali).toBe(0);
    expect(balances.sara).toBe(0);
  });

  it('keeps currencies apart', () => {
    const a = { currency: 'PKR', paidBy: 'x', amountMinor: 100, shares: splitEqual(100, ['x', 'y']) };
    const b = { currency: 'USD', paidBy: 'y', amountMinor: 40, shares: splitEqual(40, ['x', 'y']) };
    const out = computeBalances([a, b], []);
    expect(out.PKR).toEqual({ x: 50, y: -50 });
    expect(out.USD).toEqual({ y: 20, x: -20 });
  });

  it('suggests the fewest payments', () => {
    const transfers = suggestTransfers({ ali: 20000, sara: -8000, bilal: -12000 });
    expect(transfers).toEqual([
      { fromUserId: 'bilal', toUserId: 'ali', amountMinor: 12000 },
      { fromUserId: 'sara', toUserId: 'ali', amountMinor: 8000 },
    ]);
    expect(suggestTransfers({ a: 0, b: 0 })).toEqual([]);
  });

  it('splits by percent and the parts add up', () => {
    const parts = splitByPercent(1000, [{ userId: 'a', bp: 3333 }, { userId: 'b', bp: 3333 }, { userId: 'c', bp: 3334 }]);
    expect(parts.reduce((sum, part) => sum + part.amountMinor, 0)).toBe(1000);
    expect(splitByPercent(10000, [{ userId: 'a', bp: 7000 }, { userId: 'b', bp: 3000 }]).map((part) => part.amountMinor)).toEqual([7000, 3000]);
    expect(splitByPercent(1000, [{ userId: 'a', bp: 5000 }, { userId: 'b', bp: 4000 }])).toBeNull();
  });
});
