import { describe, it, expect } from 'vitest';
import axios from 'axios';
import { installRequestCache, clearRequestCache } from '../src/services/requestCache.js';

const makeApi = () => {
  const calls = [];
  const adapter = async (config) => {
    calls.push(`${String(config.method).toUpperCase()} ${config.url}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { data: { items: [calls.length] }, status: 200, statusText: 'OK', headers: {}, config };
  };
  const api = axios.create({ adapter, baseURL: 'http://x.test' });
  installRequestCache(api);
  clearRequestCache();
  return { api, calls };
};

describe('request cache', () => {
  it('sends one request when the same GET is asked for at the same time', async () => {
    const { api, calls } = makeApi();
    await Promise.all([api.get('/bills', { params: { today: '2026-11-05' } }), api.get('/bills', { params: { today: '2026-11-05' } }), api.get('/bills', { params: { today: '2026-11-05' } })]);
    expect(calls).toEqual(['GET /bills']);
  });

  it('reuses a fresh answer, and gives every caller its own copy', async () => {
    const { api, calls } = makeApi();
    const first = await api.get('/categories');
    first.data.items.push('changed');
    const second = await api.get('/categories');
    expect(calls).toHaveLength(1);
    expect(second.data.items).toEqual([1]);
  });

  it('asks again for different parameters', async () => {
    const { api, calls } = makeApi();
    await api.get('/expenses', { params: { month: '2026-10' } });
    await api.get('/expenses', { params: { month: '2026-11' } });
    expect(calls).toHaveLength(2);
  });

  it('forgets everything after a change is saved', async () => {
    const { api, calls } = makeApi();
    await api.get('/loans');
    await api.post('/loans', { x: 1 });
    await api.get('/loans');
    expect(calls).toEqual(['GET /loans', 'POST /loans', 'GET /loans']);
  });

  it('never caches the admin, auth or security areas', async () => {
    const { api, calls } = makeApi();
    await api.get('/admin/overview');
    await api.get('/admin/overview');
    await api.get('/auth/me');
    await api.get('/auth/me');
    expect(calls).toHaveLength(4);
  });
});
