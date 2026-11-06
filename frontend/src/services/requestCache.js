import axios from 'axios';

const TTL_MS = 8000;
const NEVER_CACHE = ['/admin', '/auth', '/security'];

const cache = new Map();
const inflight = new Map();

const authOf = (config) => {
  const headers = config.headers;
  if (!headers) return '';
  return (typeof headers.get === 'function' ? headers.get('Authorization') : headers.Authorization) || '';
};

const keyOf = (config) => `${authOf(config)}|${config.baseURL || ''}${config.url}|${JSON.stringify(config.params || {})}`;

const copyFor = (response, config) => ({
  ...response,
  config,
  data: response.data && typeof response.data === 'object' ? structuredClone(response.data) : response.data,
});

export const clearRequestCache = () => {
  cache.clear();
};

export const installRequestCache = (instance) => {
  const base = axios.getAdapter(instance.defaults.adapter);

  instance.defaults.adapter = async (config) => {
    const method = String(config.method || 'get').toLowerCase();

    if (method !== 'get') {
      const response = await base(config);
      cache.clear();
      return response;
    }

    if (config.responseType === 'blob' || config.responseType === 'arraybuffer') return base(config);

    const url = String(config.url || '');
    const cacheable = !NEVER_CACHE.some((prefix) => url.startsWith(prefix));
    const key = keyOf(config);

    if (cacheable) {
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < TTL_MS) return copyFor(hit.response, config);
    }

    let pending = inflight.get(key);
    if (!pending) {
      pending = base(config)
        .then((response) => {
          if (cacheable) cache.set(key, { at: Date.now(), response });
          return response;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }

    return pending.then((response) => copyFor(response, config));
  };
};
