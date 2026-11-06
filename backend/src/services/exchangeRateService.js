import { SUPPORTED_CURRENCIES } from '../utils/currencies.js';

const CACHE_TTL_MS = 10 * 60 * 1000;
const LIVE_TTL_MS = 20 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const LIVE_TIMEOUT_MS = 5000;
const MAX_LIVE_SYMBOLS = 40;
const LIVE_CONCURRENCY = 8;

export const LIVE_CURRENCIES = SUPPORTED_CURRENCIES;

const cache = new Map();
const liveCache = new Map();

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

const fetchLivePrice = async (from, to) => {
  if (from === to) return 1;
  const pair = `${from}${to}=X`;
  const cached = liveCache.get(pair);
  if (cached && cached.expiresAt > Date.now()) return cached.price;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pair)}?range=1d&interval=1m`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Vaultrix/1.0)', Accept: 'application/json' },
      }
    );
    if (!response.ok) return cached ? cached.price : null;
    const payload = await response.json();
    const price = Number(payload?.chart?.result?.[0]?.meta?.regularMarketPrice);
    if (!Number.isFinite(price) || price <= 0) return cached ? cached.price : null;
    liveCache.set(pair, { price, expiresAt: Date.now() + LIVE_TTL_MS });
    return price;
  } catch (error) {
    return cached ? cached.price : null;
  } finally {
    clearTimeout(timeout);
  }
};

const mapLimit = async (items, limit, task) => {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

const codesPerUsd = async (code) => {
  if (code === 'USD') return 1;
  const direct = await fetchLivePrice('USD', code);
  if (direct && direct >= 1) return direct;
  const inverse = await fetchLivePrice(code, 'USD');
  if (inverse) return 1 / inverse;
  return direct;
};

const pairRate = async (base, code, basePerUsd) => {
  const direct = await fetchLivePrice(base, code);
  if (direct && direct >= 1) return direct;
  const inverse = await fetchLivePrice(code, base);
  if (inverse) return 1 / inverse;
  const perUsd = await codesPerUsd(code);
  if (perUsd && basePerUsd) return perUsd / basePerUsd;
  return direct;
};

const withLiveRates = async (data, symbols) => {
  const wanted = [...new Set([...LIVE_CURRENCIES, ...symbols])].filter((code) => code !== data.base).slice(0, MAX_LIVE_SYMBOLS);
  if (wanted.length === 0) return data;

  const basePerUsd = await codesPerUsd(data.base);
  const prices = await mapLimit(wanted, LIVE_CONCURRENCY, (code) => pairRate(data.base, code, basePerUsd));

  const rates = { ...data.rates };
  const live = [];
  wanted.forEach((code, index) => {
    if (prices[index]) {
      rates[code] = prices[index];
      live.push(code);
    }
  });
  return live.length ? { ...data, rates, live, liveAt: new Date().toISOString() } : data;
};

export const getRates = async (base, symbols = []) => {
  const table = await getRateTable(base);
  return withLiveRates(table, symbols);
};

const getRateTable = async (base) => {
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
