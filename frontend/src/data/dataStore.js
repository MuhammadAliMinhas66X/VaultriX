import { onMutation, onCacheCleared } from '../services/requestCache.js';

const resources = new Map();
const entries = new Map();
const retains = new Map();
const subscribers = new Map();
const pollers = new Map();
const rules = [];

export const EMPTY_ENTRY = Object.freeze({ data: undefined, error: null, errorStamp: 0, loading: false, stale: true, updatedAt: 0, promise: null, gen: 0 });

const stable = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
    .join(',')}}`;
};

export const keyOf = (name, params) => `${name}:${stable(params)}`;

export const readEntry = (key) => entries.get(key) || EMPTY_ENTRY;

const paramsOf = new Map();

const emit = (key) => {
  const set = subscribers.get(key);
  if (set) [...set].forEach((listener) => listener());
};

const write = (key, patch) => {
  entries.set(key, { ...readEntry(key), ...patch });
  emit(key);
};

export const registerResource = (name, definition) => {
  resources.set(name, { staleMs: 30000, pollMs: 0, ...definition });
};

export const registerRules = (list) => {
  rules.length = 0;
  list.forEach((rule) => rules.push(rule));
};

export const subscribe = (key, listener) => {
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key).add(listener);
  return () => subscribers.get(key).delete(listener);
};

export const load = (name, params, { force = false } = {}) => {
  const resource = resources.get(name);
  if (!resource) return Promise.resolve(undefined);

  const key = keyOf(name, params);
  paramsOf.set(key, { name, params });
  const entry = readEntry(key);

  if (entry.promise) return entry.promise;
  if (!force && entry.data !== undefined && !entry.stale && Date.now() - entry.updatedAt < resource.staleMs) return Promise.resolve(entry.data);

  const startedAt = entry.gen;
  const promise = Promise.resolve()
    .then(() => resource.fetch(params))
    .then((data) => {
      const latest = readEntry(key);
      write(key, { data, error: null, loading: false, stale: false, updatedAt: Date.now(), promise: null });
      if (latest.gen !== startedAt) load(name, params, { force: true });
      return data;
    })
    .catch((error) => {
      const latest = readEntry(key);
      write(key, { error, errorStamp: latest.errorStamp + 1, loading: false, promise: null });
      return undefined;
    });

  write(key, { loading: true, promise });
  return promise;
};

export const setData = (name, params, updater) => {
  const key = keyOf(name, params);
  const entry = readEntry(key);
  write(key, { data: updater(entry.data), updatedAt: Date.now(), stale: false });
};

export const invalidate = (names) => {
  const wanted = new Set(names);
  [...entries.keys()].forEach((key) => {
    const info = paramsOf.get(key);
    if (!info || !wanted.has(info.name)) return;
    const entry = readEntry(key);
    write(key, { stale: true, gen: entry.gen + 1 });
    if ((retains.get(key) || 0) > 0 && !entry.promise) load(info.name, info.params, { force: true });
  });
};

export const invalidateByUrl = (url) => {
  const path = `/${String(url).split('?')[0].replace(/^\/+/, '')}`;
  const names = new Set();
  rules.forEach((rule) => {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) rule.invalidates.forEach((name) => names.add(name));
  });
  if (names.size > 0) invalidate([...names]);
};

const startPolling = (key) => {
  const info = paramsOf.get(key);
  const resource = info && resources.get(info.name);
  if (!resource || !resource.pollMs || pollers.has(key)) return;
  pollers.set(
    key,
    setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      load(info.name, info.params, { force: true });
    }, resource.pollMs)
  );
};

const stopPolling = (key) => {
  if (pollers.has(key)) {
    clearInterval(pollers.get(key));
    pollers.delete(key);
  }
};

export const retain = (name, params) => {
  const key = keyOf(name, params);
  paramsOf.set(key, { name, params });
  retains.set(key, (retains.get(key) || 0) + 1);
  startPolling(key);
};

export const release = (name, params) => {
  const key = keyOf(name, params);
  const count = (retains.get(key) || 0) - 1;
  if (count <= 0) {
    retains.delete(key);
    stopPolling(key);
  } else {
    retains.set(key, count);
  }
};

export const refreshActive = () => {
  retains.forEach((count, key) => {
    const info = paramsOf.get(key);
    const resource = info && resources.get(info.name);
    if (count > 0 && resource && resource.pollMs) load(info.name, info.params, { force: true });
  });
};

export const clearStore = () => {
  const keys = [...entries.keys()];
  entries.clear();
  pollers.forEach((timer) => clearInterval(timer));
  pollers.clear();
  keys.forEach(emit);
};

onMutation(invalidateByUrl);
onCacheCleared(clearStore);

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshActive();
  });
  window.addEventListener('online', refreshActive);
}
