import { describe, it, expect } from 'vitest';
import { roundDay, localDay, committeeAttention } from '../src/utils/committeeMath.js';

describe('committee preview dates', () => {
  it('matches the server rule for month ends and year rollover', () => {
    expect([1, 2, 3, 4].map((round) => roundDay('2026-01-31', 'monthly', round))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    expect(roundDay('2026-11-15', 'monthly', 3)).toBe('2027-01-15');
    expect(roundDay('2026-03-02', 'weekly', 3)).toBe('2026-03-16');
  });

  it('reads the calendar day of the user, not of UTC', () => {
    expect(localDay(new Date('2026-05-01T12:00:00'))).toBe('2026-05-01');
  });
});

describe('committee attention list', () => {
  const base = { id: 'a', name: 'Office', currency: 'PKR', contribution: 5000, finished: false, role: 'member', payoutStatus: 'upcoming', lateMembers: 0, potsToHandOver: 0, next: { round: 2, due: '2026-02-05', status: 'overdue' } };
  it('lists a payment that is overdue or due within a week, and skips later ones', () => {
    expect(committeeAttention([base], '2026-02-10')[0]).toMatchObject({ kind: 'committeePay', days: -5, href: '/committees/a' });
    expect(committeeAttention([{ ...base, next: { round: 3, due: '2026-03-05', status: 'upcoming' } }], '2026-02-10')).toEqual([]);
  });
  it('adds organizer rows for late members and pots, and a ready payout', () => {
    const kinds = committeeAttention([{ ...base, role: 'organizer', lateMembers: 2, potsToHandOver: 1, payoutStatus: 'ready' }], '2026-02-10').map((item) => item.kind);
    expect(kinds.sort()).toEqual(['committeeLate', 'committeePay', 'committeePayout', 'committeePot']);
  });
  it('ignores finished committees', () => {
    expect(committeeAttention([{ ...base, finished: true }], '2026-02-10')).toEqual([]);
  });
});
