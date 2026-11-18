import { describe, it, expect } from 'vitest';
import { roundDay, committeeSummary, assignWinner, slotsAreValid } from '../../src/utils/committee.js';

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

const person = (name, slot, rounds = []) => ({ _id: name, name, slot, payments: rounds.map((round) => ({ round, paidAt: new Date('2026-01-05T00:00:00Z'), amountMinor: 500000 })) });
const organizer = { ...base, role: 'organizer', mySlot: 1, members: [person('Ali', 2, [1, 2]), person('Sara', null, [1]), person('Omar', 4, [])] };

describe('organizer view', () => {
  it('finds each round winner and counts who paid the round', () => {
    const summary = committeeSummary({ ...organizer, paid: [{ round: 1, paidAt: new Date('2026-01-05T00:00:00Z'), amountMinor: 500000 }] }, '2026-02-10');
    expect(summary.rounds[0].winner).toEqual({ type: 'me', id: null, name: null });
    expect(summary.rounds[1].winner).toMatchObject({ type: 'member', name: 'Ali' });
    expect(summary.rounds[2].winner).toBeNull();
    expect(summary.rounds[0].collected).toBe(4 - 1); // me + Ali + Sara
    expect(summary.rounds[1].collected).toBe(1); // Ali only
  });

  it('lists who is late and what is owed for rounds already past due', () => {
    const summary = committeeSummary(organizer, '2026-02-10');
    expect(summary.members.find((item) => item.name === 'Omar').lateRounds).toEqual([1, 2]);
    expect(summary.members.find((item) => item.name === 'Sara').lateRounds).toEqual([2]);
    expect(summary.members.find((item) => item.name === 'Ali').lateRounds).toEqual([]);
    expect(summary.lateMembers).toBe(2);
    expect(summary.owedMinor).toBe(3 * 500000);
  });

  it('counts pots that are due and not handed over yet, and names still missing', () => {
    const summary = committeeSummary(organizer, '2026-02-10');
    expect(summary.potsToHandOver).toBe(1);
    expect(summary.missingNames).toBe(0);
    const done = committeeSummary({ ...organizer, payouts: [{ round: 2, paidAt: new Date('2026-02-06T00:00:00Z') }] }, '2026-02-10');
    expect(done.potsToHandOver).toBe(0);
    expect(committeeSummary({ ...organizer, members: [person('Ali', 2)] }, '2026-02-10').missingNames).toBe(2);
  });

  it('has an undrawn payout until the member knows the turn', () => {
    const summary = committeeSummary({ ...base, mySlot: null }, '2026-03-01');
    expect(summary.payoutStatus).toBe('undrawn');
    expect(summary.payoutDay).toBeNull();
  });
});

describe('draw', () => {
  it('gives a round to one person only and frees their old round', () => {
    const result = assignWinner(organizer, 2, 'Sara');
    expect(result.slots.get('Sara')).toBe(2);
    expect(result.slots.get('Ali')).toBeNull();
    expect(result.mySlot).toBe(1);
    const swapped = assignWinner(organizer, 1, 'Ali');
    expect(swapped.mySlot).toBeNull();
    expect(swapped.slots.get('Ali')).toBe(1);
  });

  it('can give a round to me and clear it', () => {
    expect(assignWinner(organizer, 3, 'me').mySlot).toBe(3);
    expect(assignWinner(organizer, 1, null).mySlot).toBeNull();
    expect(assignWinner(organizer, 3, 'Nobody')).toBeNull();
  });

  it('rejects shared or out of range turns', () => {
    expect(slotsAreValid(organizer)).toBe(true);
    expect(slotsAreValid({ ...organizer, members: [person('Ali', 1)] })).toBe(false);
    expect(slotsAreValid({ ...organizer, members: [person('Ali', 9)] })).toBe(false);
  });
});
