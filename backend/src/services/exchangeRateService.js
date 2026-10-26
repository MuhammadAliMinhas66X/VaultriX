// Live exchange rates for converting an income stream's own currency into
// whatever currency the person picked for the app (their "app currency").
// open.er-api.com is free, needs no API key, and updates roughly daily -
// plenty for a personal finance dashboard, nowhere near what you'd need
// for anything that actually executes a trade. Results are cached in
// memory per base currency so a page full of streams doesn't trigger a
// fresh outbound call per render, and so the app still works (on slightly
// stale numbers) for a while if the provider is briefly unreachable.
const RATES_URL = (base) => `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour - rates don't move fast enough to need less.
const FETCH_TIMEOUT_MS = 8000;

const cache = new Map(); // base -> { data: { base, rates, fetchedAt }, expiresAt }

export class ExchangeRateError extends Error {}

export const getRates = async (base) => {
  const key = base.toUpperCase();
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(RATES_URL(key), { signal: controller.signal });
    if (!response.ok) throw new ExchangeRateError(`Rate provider responded with ${response.status}`);

    const payload = await response.json();
    if (payload?.result !== 'success' || !payload.rates) {
      throw new ExchangeRateError('Rate provider returned an unexpected response.');
    }

    const data = { base: key, rates: payload.rates, fetchedAt: new Date().toISOString() };
    cache.set(key, { data, expiresAt: now + CACHE_TTL_MS });
    return data;
  } catch (error) {
    // If we have a stale cache entry, serving it beats showing nothing -
    // flagged via `stale: true` so the frontend can say so if it wants to.
    if (cached) {
      return { ...cached.data, stale: true };
    }
    throw error instanceof ExchangeRateError ? error : new ExchangeRateError('Could not reach the exchange rate provider.');
  } finally {
    clearTimeout(timeout);
  }
};
