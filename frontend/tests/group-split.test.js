import { describe, it, expect } from 'vitest';
import { splitEqualMinor, leftToAssign, toMinor } from '../src/utils/groupSplit.js';

describe('group split on screen', () => {
  it('adds up exactly', () => {
    const parts = splitEqualMinor(1000, ['a', 'b', 'c']);
    expect(Object.values(parts)).toEqual([334, 333, 333]);
    expect(splitEqualMinor(5, [])).toEqual({});
  });
  it('rounds money safely', () => {
    expect(toMinor('10.1')).toBe(1010);
    expect(toMinor('0.29')).toBe(29);
    expect(toMinor('')).toBe(0);
  });
  it('shows what is left to assign', () => {
    expect(leftToAssign('100', { a: '40', b: '35.5' })).toBe(2450);
    expect(leftToAssign('100', { a: '60', b: '40' })).toBe(0);
  });
});
