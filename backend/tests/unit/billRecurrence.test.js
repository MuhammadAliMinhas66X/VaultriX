import { describe, it, expect } from 'vitest';
import { addSteps, defaultNextBillAt, makeAnchor, occurrenceDates, generationDate, skipMissed } from '../../src/utils/billRecurrence.js';

const day = (text) => new Date(`${text}T00:00:00.000Z`);
const text = (date) => date.toISOString().slice(0, 10);

describe('billRecurrence', () => {
  it('keeps the day of month from the anchor across short months', () => {
    const anchor = day('2026-01-31');
    expect(text(addSteps(anchor, 'monthly', 1))).toBe('2026-02-28');
    expect(text(addSteps(anchor, 'monthly', 2))).toBe('2026-03-31');
    expect(text(addSteps(anchor, 'monthly', 13))).toBe('2027-02-28');
  });

  it('steps daily, weekly, quarterly and yearly', () => {
    expect(text(addSteps(day('2026-03-01'), 'daily', 3))).toBe('2026-03-04');
    expect(text(addSteps(day('2026-03-01'), 'weekly', 2))).toBe('2026-03-15');
    expect(text(addSteps(day('2026-11-30'), 'quarterly', 1))).toBe('2027-02-28');
    expect(text(addSteps(day('2028-02-29'), 'yearly', 1))).toBe('2029-02-28');
  });

  it('shows the next bill 5 days before it is due, not a month early', () => {
    expect(text(defaultNextBillAt({ dueAt: day('2026-11-21') }, 'monthly'))).toBe('2026-12-16');
    expect(text(defaultNextBillAt({ dueAt: day('2026-11-21') }, 'weekly'))).toBe('2026-11-23');
    expect(text(defaultNextBillAt({ dueAt: day('2026-11-21') }, 'daily'))).toBe('2026-11-22');
    expect(text(defaultNextBillAt({ dueAt: day('2026-01-31') }, 'monthly'))).toBe('2026-02-23');
  });

  it('builds later occurrences from the anchor without drift', () => {
    const anchor = makeAnchor({ sequence: 1, dueAt: day('2026-01-31'), periodStart: day('2026-01-01'), periodEnd: day('2026-01-31'), nextBillAt: day('2026-02-01') });
    const second = occurrenceDates(anchor, 'monthly', 2);
    expect(text(second.dueAt)).toBe('2026-02-28');
    expect(text(second.periodStart)).toBe('2026-02-01');
    expect(text(second.periodEnd)).toBe('2026-02-28');
    const third = occurrenceDates(anchor, 'monthly', 3);
    expect(text(third.dueAt)).toBe('2026-03-31');
    expect(text(generationDate(anchor, 'monthly', 2))).toBe('2026-02-23');
    expect(text(generationDate(anchor, 'monthly', 3))).toBe('2026-03-26');
  });

  it('skips missed periods when a paused series resumes', () => {
    const anchor = makeAnchor({ sequence: 1, dueAt: day('2026-01-10'), periodStart: day('2026-01-01'), periodEnd: day('2026-01-31'), nextBillAt: day('2026-02-01') });
    expect(skipMissed(anchor, 'monthly', 2, day('2026-02-01'))).toBe(2);
    expect(skipMissed(anchor, 'monthly', 2, day('2026-05-15'))).toBe(6);
  });
});
