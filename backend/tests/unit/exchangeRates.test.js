import { describe, it, expect, beforeEach, vi } from 'vitest';

const usd = { PKR: 1 / 276.2, USD: 1, EUR: 1.08, GBP: 1.3 };

const makeFetch = (failLive = false) =>
  vi.fn(async (url) => {
    const text = String(url);
    if (text.includes('finance.yahoo.com')) {
      if (failLive) return { ok: false, status: 429, json: async () => ({}) };
      const pair = decodeURIComponent(text.split('/chart/')[1].split('?')[0]).replace('=X', '');
      const from = pair.slice(0, 3);
      const to = pair.slice(3);
      if (!(from in usd) || !(to in usd)) return { ok: false, status: 404, json: async () => ({}) };
      return { ok: true, json: async () => ({ chart: { result: [{ meta: { regularMarketPrice: Number((usd[from] / usd[to]).toFixed(4)) } }] } }) };
    }
    const base = text.split('/currencies/')[1].replace('.json', '');
    return { ok: true, json: async () => ({ date: '2026-11-03', [base]: { usd: 1, pkr: 280, eur: 0.9 } }) };
  });

describe('exchangeRateService live rates', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('matches the live market for PKR to USD', async () => {
    global.fetch = makeFetch();
    const { getRates } = await import('../../src/services/exchangeRateService.js');
    const data = await getRates('USD');
    expect(data.live).toContain('PKR');
    expect(15000 / data.rates.PKR).toBeCloseTo(15000 / 276.2, 2);
    expect(Number((15000 / data.rates.PKR).toFixed(2))).toBe(54.31);
    expect(Number((50283 / data.rates.PKR).toFixed(2))).toBe(182.05);
  });

  it('gives consistent cross rates from another base', async () => {
    global.fetch = makeFetch();
    const { getRates } = await import('../../src/services/exchangeRateService.js');
    const data = await getRates('EUR');
    expect(data.rates.PKR).toBeCloseTo(276.2 * 1.08, 1);
    expect(global.fetch.mock.calls.some(([url]) => String(url).includes('EURPKR%3DX') || String(url).includes('EURPKR=X'))).toBe(true);
    expect(data.rates.USD).toBeCloseTo(1.08, 3);
  });

  it('falls back to the daily table when live prices fail', async () => {
    global.fetch = makeFetch(true);
    const { getRates } = await import('../../src/services/exchangeRateService.js');
    const data = await getRates('PKR');
    expect(data.live).toBeUndefined();
    expect(data.rates.PKR).toBe(1);
  });

  it('keeps the last live price when a later fetch fails', async () => {
    global.fetch = makeFetch();
    const { getRates } = await import('../../src/services/exchangeRateService.js');
    vi.useFakeTimers();
    await getRates('USD');
    vi.advanceTimersByTime(2 * 60 * 1000);
    global.fetch = makeFetch(true);
    const data = await getRates('USD');
    vi.useRealTimers();
    expect(data.live).toContain('PKR');
    expect(15000 / data.rates.PKR).toBeCloseTo(15000 / 276.2, 2);
  });
});
