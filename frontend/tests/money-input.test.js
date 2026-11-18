import { describe, expect, it } from 'vitest';
import { cleanMoney } from '../src/components/MoneyInput.jsx';

describe('cleanMoney', () => {
  it('keeps only digits and one dot', () => {
    expect(cleanMoney('12a,50')).toBe('12.50');
    expect(cleanMoney('-40')).toBe('40');
  });

  it('keeps a leading minus only when negative amounts are allowed', () => {
    expect(cleanMoney('-40.567', 2, true)).toBe('-40.56');
    expect(cleanMoney('-', 2, true)).toBe('-');
    expect(cleanMoney('4-0', 2, true)).toBe('40');
  });
});
