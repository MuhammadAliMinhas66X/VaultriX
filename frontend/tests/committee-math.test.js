import { describe, it, expect } from 'vitest';
import { roundDay, localDay } from '../src/utils/committeeMath.js';

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
