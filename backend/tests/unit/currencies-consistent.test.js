import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUPPORTED_CURRENCIES, isSupportedCurrency } from '../../src/utils/currencies.js';
import { isCurrencyCode } from '../../src/utils/validators.js';
import { LIVE_CURRENCIES } from '../../src/services/exchangeRateService.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const optionsFile = fs.readFileSync(path.resolve(here, '../../../frontend/src/utils/options.js'), 'utf8');
const block = optionsFile.slice(optionsFile.indexOf('export const CURRENCIES'), optionsFile.indexOf('export const formatCurrency'));
const frontendCodes = [...block.matchAll(/value: '([A-Z]{3})'/g)].map((match) => match[1]);

describe('one currency list everywhere', () => {
  it('the app dropdowns (frontend) and the server accept exactly the same currencies', () => {
    expect(frontendCodes.length).toBeGreaterThan(0);
    expect([...frontendCodes].sort()).toEqual([...SUPPORTED_CURRENCIES].sort());
  });

  it('live exchange rates cover the same list', () => {
    expect([...LIVE_CURRENCIES].sort()).toEqual([...SUPPORTED_CURRENCIES].sort());
  });

  it('has no duplicates', () => {
    expect(new Set(SUPPORTED_CURRENCIES).size).toBe(SUPPORTED_CURRENCIES.length);
  });

  it('the server rejects a currency that is not in the list', () => {
    expect(isCurrencyCode('USD')).toBe(true);
    expect(isCurrencyCode('XYZ')).toBe(false);
    expect(isCurrencyCode('usd')).toBe(false);
    expect(isSupportedCurrency(undefined)).toBe(false);
  });
});
