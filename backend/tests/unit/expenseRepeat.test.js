import { describe, it, expect } from 'vitest';
import { nextRepeatDate } from '../../src/utils/expenseRepeat.js';

const head = (frequency, spentAt, step = 1) => ({ repeatFrequency: frequency, repeatAnchor: new Date(spentAt), spentAt: new Date(spentAt), repeatStep: step });
const day = (date) => date.toISOString().slice(0, 10);

describe('repeating expenses: next date', () => {
  it('moves by the chosen rhythm', () => {
    expect(day(nextRepeatDate(head('daily', '2026-11-01')))).toBe('2026-11-02');
    expect(day(nextRepeatDate(head('weekly', '2026-11-01')))).toBe('2026-11-08');
    expect(day(nextRepeatDate(head('monthly', '2026-11-01')))).toBe('2026-12-01');
    expect(day(nextRepeatDate(head('yearly', '2026-11-01')))).toBe('2027-11-01');
  });

  it('keeps the day of the month, even after a short month', () => {
    expect(day(nextRepeatDate(head('monthly', '2026-01-31', 1)))).toBe('2026-02-28');
    expect(day(nextRepeatDate(head('monthly', '2026-01-31', 2)))).toBe('2026-03-31');
  });
});
