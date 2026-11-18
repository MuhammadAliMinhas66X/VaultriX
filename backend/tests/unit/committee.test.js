import { describe, it, expect } from 'vitest';
import { roundDay, committeeSummary } from '../../src/utils/committee.js';

const start = new Date('2026-01-31T00:00:00Z');
const base = { startDate: new Date('2026-01-05T00:00:00Z'), frequency: 'monthly', size: 4, contributionMinor: 500000, mySlot: 2, paid: [], payoutReceivedAt: null };

describe('committee dates', () => {
  it('keeps the day of month and uses the last day of shorter months without drifting', () => {
    expect([1, 2, 3, 4, 5].map((round) => roundDay(start, 'monthly', round))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  });

  it('rolls over the year and steps weekly rounds by seven days', () => {
    expect(roundDay(new Date('2026-11-15T00:00:00Z'), 'monthly', 3)).toBe('2027-01-15');
    expect(roundDay(new Date('2026-03-02T00:00:00Z'), 'weekly', 3)).toBe('2026-03-16');
  });
});

describe('committee summary', () => {
  it('marks paid, overdue, due and upcoming rounds and finds the next unpaid one', () => {
    const summary = committeeSummary({ ...base, paid: [{ round: 1, paidAt: new Date('2026-01-05T00:00:00Z'), amountMinor: 500000 }] }, '2026-03-05');
    expect(summary.rounds.map((item) => item.status)).toEqual(['paid', 'overdue', 'due', 'upcoming']);
    expect(summary.next).toMatchObject({ round: 2, due: '2026-02-05', status: 'overdue' });
    expect(summary.overdueCount).toBe(1);
    expect(summary.paidMinor).toBe(500000);
    expect(summary.totalMinor).toBe(2000000);
    expect(summary.payoutMinor).toBe(2000000);
  });

  it('knows when the payout is upcoming, ready or received', () => {
    expect(committeeSummary(base, '2026-01-20').payoutStatus).toBe('upcoming');
    expect(committeeSummary(base, '2026-02-05').payoutStatus).toBe('ready');
    expect(committeeSummary({ ...base, payoutReceivedAt: new Date('2026-02-06T00:00:00Z') }, '2026-02-10').payoutStatus).toBe('received');
    expect(committeeSummary(base, '2026-02-05').payoutDay).toBe('2026-02-05');
  });

  it('is finished only when every round is paid and the payout is in', () => {
    const paid = [1, 2, 3, 4].map((round) => ({ round, paidAt: new Date('2026-01-05T00:00:00Z'), amountMinor: 500000 }));
    expect(committeeSummary({ ...base, paid }, '2026-06-01').finished).toBe(false);
    expect(committeeSummary({ ...base, paid, payoutReceivedAt: new Date('2026-02-06T00:00:00Z') }, '2026-06-01').finished).toBe(true);
    expect(committeeSummary({ ...base, paid }, '2026-06-01').next).toBeNull();
  });
});
