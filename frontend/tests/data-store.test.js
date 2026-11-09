import { describe, it, expect, beforeEach } from 'vitest';
import { registerResource, registerRules, load, retain, release, readEntry, keyOf, setData, invalidateByUrl, clearStore } from '../src/data/dataStore.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let calls;
beforeEach(() => {
  clearStore();
  calls = [];
  registerResource('things', {
    fetch: async (params) => {
      calls.push(`things ${JSON.stringify(params)}`);
      await wait(10);
      return { n: calls.length };
    },
    staleMs: 1000,
  });
  registerResource('other', { fetch: async () => ({ ok: true }), staleMs: 1000 });
  registerRules([{ prefix: '/things', invalidates: ['things'] }]);
});

describe('data store', () => {
  it('fetches once when many ask at the same time', async () => {
    await Promise.all([load('things', { a: 1 }), load('things', { a: 1 }), load('things', { a: 1 })]);
    expect(calls).toHaveLength(1);
  });

  it('treats the same params in any order as one entry', () => {
    expect(keyOf('things', { a: 1, b: 2 })).toBe(keyOf('things', { b: 2, a: 1 }));
  });

  it('reuses fresh data and does not fetch again', async () => {
    await load('things', null);
    await load('things', null);
    expect(calls).toHaveLength(1);
  });

  it('reloads a screen that is open when a save invalidates it', async () => {
    retain('things', null);
    await load('things', null);
    invalidateByUrl('/things/5');
    await wait(40);
    expect(calls).toHaveLength(2);
    release('things', null);
  });

  it('only marks closed screens stale, and fetches when they open again', async () => {
    await load('things', null);
    invalidateByUrl('/things');
    await wait(30);
    expect(calls).toHaveLength(1);
    expect(readEntry(keyOf('things', null)).stale).toBe(true);
    await load('things', null);
    expect(calls).toHaveLength(2);
  });

  it('keeps showing old data while it reloads', async () => {
    await load('things', null);
    const before = readEntry(keyOf('things', null)).data;
    const pending = load('things', null, { force: true });
    expect(readEntry(keyOf('things', null)).data).toBe(before);
    await pending;
  });

  it('fetches again if the data was invalidated while a request was running', async () => {
    retain('things', null);
    const pending = load('things', null);
    invalidateByUrl('/things');
    await pending;
    await wait(40);
    expect(calls.length).toBe(2);
    release('things', null);
  });

  it('keeps errors in the entry and counts them', async () => {
    registerResource('broken', { fetch: async () => { throw new Error('nope'); } });
    await load('broken', null);
    const entry = readEntry(keyOf('broken', null));
    expect(entry.error.message).toBe('nope');
    expect(entry.errorStamp).toBe(1);
  });

  it('lets a page update data it already has', async () => {
    await load('things', null);
    setData('things', null, (prev) => ({ ...prev, n: 99 }));
    expect(readEntry(keyOf('things', null)).data.n).toBe(99);
  });

  it('forgets everything on sign out', async () => {
    await load('things', null);
    clearStore();
    expect(readEntry(keyOf('things', null)).data).toBeUndefined();
  });

  it('polls only while someone is looking, and stops after', async () => {
    registerResource('live', { fetch: async () => { calls.push('live'); return 1; }, staleMs: 5, pollMs: 25 });
    retain('live', null);
    await wait(90);
    release('live', null);
    const count = calls.filter((item) => item === 'live').length;
    expect(count).toBeGreaterThanOrEqual(2);
    await wait(80);
    expect(calls.filter((item) => item === 'live').length).toBe(count);
  });
});
