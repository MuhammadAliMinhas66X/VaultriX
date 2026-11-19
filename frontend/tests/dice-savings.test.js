import { describe, it, expect } from 'vitest';
import { diceNeeded, numberFromFaces, facesFromNumber } from '../src/components/committees/DiceDraw.jsx';
import { monthlyKept, savedSummary } from '../src/utils/savingsMath.js';
import { roundDay } from '../src/utils/committeeMath.js';

describe('dice', () => {
  it('uses one die up to 6 people, two up to 36, three up to 216', () => {
    expect([1, 6, 7, 36, 37, 60].map(diceNeeded)).toEqual([1, 1, 2, 2, 3, 3]);
  });
  it('turns every number into faces and back without gaps or repeats', () => {
    for (const count of [6, 36, 60]) {
      const dice = diceNeeded(count);
      const seen = new Set();
      for (let number = 1; number <= count; number += 1) {
        const faces = facesFromNumber(number, dice);
        expect(faces.every((face) => face >= 1 && face <= 6)).toBe(true);
        expect(numberFromFaces(faces)).toBe(number);
        seen.add(faces.join(''));
      }
      expect(seen.size).toBe(count);
    }
  });
});

describe('savings', () => {
  const rates = { PKR: 1 };
  const streams = [{ id: 's', currency: 'PKR' }];
  it('keeps what is left of each month and never goes below zero', () => {
    const receipts = [
      { streamId: 's', receivedAt: '2026-09-05', amount: 1000, currency: 'PKR' },
      { streamId: 's', receivedAt: '2026-10-05', amount: 1000, currency: 'PKR' },
      { streamId: 's', receivedAt: '2026-11-05', amount: 1000, currency: 'PKR' },
    ];
    const totals = [
      { month: '2026-09', currency: 'PKR', self: 300, other: 0, repaid: 0 },
      { month: '2026-10', currency: 'PKR', self: 1500, other: 0, repaid: 0 },
    ];
    const rows = monthlyKept({ receipts, streams, totals, rates, base: 'PKR', now: new Date('2026-11-18T10:00:00Z') });
    expect(rows.map((row) => [row.month, row.kept, row.open])).toEqual([['2026-11', 1000, true], ['2026-10', 0, false], ['2026-09', 700, false]]);
    const entries = [{ amount: 500, currency: 'PKR' }, { amount: -200, currency: 'PKR' }];
    expect(savedSummary(rows, entries, rates, 'PKR')).toEqual({ auto: 1700, manual: 300, total: 2000 });
  });
  it('has no months before the first income', () => {
    expect(monthlyKept({ receipts: [], streams, totals: [], rates, base: 'PKR' })).toEqual([]);
  });
});

describe('daily committees', () => {
  it('adds one day per round', () => {
    expect(roundDay('2026-11-29', 'daily', 1)).toBe('2026-11-29');
    expect(roundDay('2026-11-29', 'daily', 3)).toBe('2026-12-01');
  });
});
