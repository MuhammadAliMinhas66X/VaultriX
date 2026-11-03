import { describe, expect, it } from 'vitest';
import { LOAN_SCALE, parseDecimalMinor, minorToMajor } from '../../src/utils/decimalMoney.js';

describe('parseDecimalMinor', () => {
  it('keeps up to four decimals exactly', () => {
    expect(parseDecimalMinor(190097.1234)).toBe(1900971234);
    expect(parseDecimalMinor('190097.1234')).toBe(1900971234);
    expect(parseDecimalMinor(0.0001)).toBe(1);
    expect(parseDecimalMinor('0.0001')).toBe(1);
    expect(parseDecimalMinor(190097)).toBe(1900970000);
    expect(parseDecimalMinor(19.1)).toBe(191000);
  });

  it('rejects more than four decimals, zero, negatives and junk', () => {
    expect(parseDecimalMinor('1.00001')).toBeUndefined();
    expect(parseDecimalMinor(0)).toBeUndefined();
    expect(parseDecimalMinor(-5)).toBeUndefined();
    expect(parseDecimalMinor('abc')).toBeUndefined();
    expect(parseDecimalMinor('1e3')).toBeUndefined();
    expect(parseDecimalMinor(undefined)).toBeUndefined();
    expect(parseDecimalMinor('')).toBeUndefined();
    expect(parseDecimalMinor(2e11)).toBeUndefined();
  });

  it('stays exact at the largest allowed amount', () => {
    const minor = parseDecimalMinor('99999999999.9999');
    expect(Number.isSafeInteger(minor)).toBe(true);
    expect(minor).toBe(999999999999999);
  });

  it('converts back without drift', () => {
    expect(minorToMajor(1900971234, LOAN_SCALE)).toBe(190097.1234);
    expect(minorToMajor(19009700, 100)).toBe(190097);
  });
});
