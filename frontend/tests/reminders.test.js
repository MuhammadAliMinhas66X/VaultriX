import { describe, it, expect } from 'vitest';
import { buildReminders } from '../src/utils/reminders.js';

const today = '2026-11-12';
const bill = (id, dueAt, extra = {}) => ({ id, billerName: id, dueAt, remaining: 100, paid: 0, currency: 'PKR', cancelledAt: null, ...extra });
const loan = (id, dueAt, extra = {}) => ({ id, personName: id, dueAt, remaining: 500, done: false, direction: 'borrowed', currency: 'PKR', ...extra });

describe('buildReminders', () => {
  it('lists overdue first, then soonest, and skips far-off, paid and cancelled', () => {
    const list = buildReminders(
      [bill('late', '2026-11-08'), bill('today', '2026-11-12'), bill('far', '2026-12-30'), bill('paid', '2026-11-10', { remaining: 0 }), bill('off', '2026-11-10', { cancelledAt: '2026-11-01' }), bill('soon', '2026-11-15')],
      [],
      today
    );
    expect(list.map((item) => item.id)).toEqual(['late', 'today', 'soon']);
    expect(list.map((item) => item.days)).toEqual([-4, 0, 3]);
  });

  it('includes loans by direction and skips loans with no due date or already repaid', () => {
    const list = buildReminders([], [loan('a', '2026-11-13'), loan('b', '2026-11-11', { direction: 'lent' }), loan('c', null), loan('d', '2026-11-12', { done: true, remaining: 0 })], today);
    expect(list.map((item) => [item.id, item.kind])).toEqual([['b', 'loanOwed'], ['a', 'loanOwe']]);
  });

  it('returns nothing when nothing is due', () => {
    expect(buildReminders([bill('x', '2027-01-01')], [], today)).toEqual([]);
  });
});
