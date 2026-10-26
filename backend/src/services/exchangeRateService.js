// Exchange rates for converting an income stream's own currency into the
// currency the person picked for the app. No API key needed. Several free
// sources are tried one after another, so one being down does not break
// the dashboard. Every source publishes mid-market rates about once a day,
// so a small gap against a live number on Google is normal. Results are
// cached in memory per base currency so a page full of streams does not
// trigger a fresh outbound call each time, and old numbers can still be
// served for a while if every source is briefly unreachable.
const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

const cache = new Map();

export class ExchangeRateError extends Error {}

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new ExchangeRateError(`Rate source responded with ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const upperKeys = (table) => {
  const rates = {};
  Object.entries(table).forEach(([code, value]) => {
    const rate = Number(value);
    if (/^[a-z]{3}$/i.test(code) && Number.isFinite(rate) && rate > 0) {
      rates[code.toUpperCase()] = rate;
    }
  });
  return rates;
};

const currencyApi = (host) => async (base) => {
  const payload = await fetchJson(`${host}/v1/currencies/${encodeURIComponent(base.toLowerCase())}.json`);
  const table = payload?.[base.toLowerCase()];
  if (!table || typeof table !== 'object') throw new ExchangeRateError('Rate source returned an unexpected response.');
  const rates = upperKeys(table);
  rates[base] = 1;
  return { rates, updatedAt: payload.date ? new Date(`${payload.date}T00:00:00Z`).toISOString() : null };
};

const openErApi = async (base) => {
  const payload = await fetchJson(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`);
  if (payload?.result !== 'success' || !payload.rates) {
    throw new ExchangeRateError('Rate source returned an unexpected response.');
  }
  const rates = upperKeys(payload.rates);
  rates[base] = 1;
  return {
    rates,
    updatedAt: payload.time_last_update_unix ? new Date(payload.time_last_update_unix * 1000).toISOString() : null,
  };
};

const SOURCES = [
  currencyApi('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest'),
  currencyApi('https://latest.currency-api.pages.dev'),
  openErApi,
];

export const getRates = async (base) => {
  const key = base.toUpperCase();
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  for (const source of SOURCES) {
    try {
      const { rates, updatedAt } = await source(key);
      const data = { base: key, rates, updatedAt, fetchedAt: new Date().toISOString() };
      cache.set(key, { data, expiresAt: now + CACHE_TTL_MS });
      return data;
    } catch (error) {
      // try the next source
    }
  }

  if (cached) {
    return { ...cached.data, stale: true };
  }
  throw new ExchangeRateError('Could not reach the exchange rate provider.');
};
