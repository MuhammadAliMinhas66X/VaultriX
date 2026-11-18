import { describe, it, expect } from 'vitest';
import {
  STATUS,
  FAILURE,
  ProbeFailure,
  classifyError,
  createHealthMonitor,
  createRequestMetrics,
} from '../../src/services/healthMonitor.js';

const makeClock = (start = 1_700_000_000_000) => {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
};

const probe = (overrides = {}) => ({ id: 'p', label: 'P', kind: 'core', run: async () => {}, ...overrides });

describe('health monitor status rules', () => {
  it('reports ok when every probe succeeds', async () => {
    const clock = makeClock();
    const monitor = createHealthMonitor({ probes: [probe({ id: 'a' }), probe({ id: 'b', kind: 'external' })], now: clock.now });
    const snap = await monitor.snapshot();
    expect(snap.overall).toBe(STATUS.OK);
    expect(snap.services.map((s) => s.status)).toEqual([STATUS.OK, STATUS.OK]);
    expect(snap.services[0].lastSuccessAt).not.toBeNull();
    expect(snap.services[0].lastFailureAt).toBeNull();
  });

  it('reports down when a core probe fails', async () => {
    const clock = makeClock();
    const monitor = createHealthMonitor({
      probes: [probe({ id: 'database', run: async () => { throw new ProbeFailure(FAILURE.NOT_READY); } })],
      now: clock.now,
    });
    const snap = await monitor.snapshot();
    expect(snap.overall).toBe(STATUS.DOWN);
    expect(snap.services[0].failureCategory).toBe(FAILURE.NOT_READY);
    expect(snap.recentFailures[0]).toMatchObject({ service: 'database', category: FAILURE.NOT_READY });
  });

  it('reports degraded, not down, when only an external probe fails', async () => {
    const clock = makeClock();
    const monitor = createHealthMonitor({
      probes: [probe({ id: 'db' }), probe({ id: 'mail', kind: 'external', run: async () => { throw new Error('boom'); } })],
      now: clock.now,
    });
    expect((await monitor.snapshot()).overall).toBe(STATUS.DEGRADED);
  });

  it('ignores services that are not configured', async () => {
    const clock = makeClock();
    const monitor = createHealthMonitor({
      probes: [probe({ id: 'db' }), probe({ id: 'cloud', kind: 'external', isConfigured: () => false, run: async () => { throw new Error('never runs'); } })],
      now: clock.now,
    });
    const snap = await monitor.snapshot();
    expect(snap.overall).toBe(STATUS.OK);
    expect(snap.services[1].status).toBe(STATUS.NOT_CONFIGURED);
    expect(snap.recentFailures).toEqual([]);
  });

  it('marks a slow success as degraded', async () => {
    const clock = makeClock();
    const monitor = createHealthMonitor({
      probes: [probe({ id: 'db', degradedMs: 100, run: async () => { clock.advance(400); } })],
      now: clock.now,
    });
    const snap = await monitor.snapshot();
    expect(snap.services[0].status).toBe(STATUS.DEGRADED);
    expect(snap.services[0].latencyMs).toBe(400);
    expect(snap.overall).toBe(STATUS.DEGRADED);
  });

  it('turns a hung probe into a timeout failure', async () => {
    const clock = makeClock();
    const monitor = createHealthMonitor({
      probes: [probe({ id: 'db', timeoutMs: 20, run: () => new Promise(() => {}) })],
      now: clock.now,
    });
    const snap = await monitor.snapshot();
    expect(snap.services[0].status).toBe(STATUS.DOWN);
    expect(snap.services[0].failureCategory).toBe(FAILURE.TIMEOUT);
  });
});

describe('health monitor never leaks error details', () => {
  it('keeps raw messages, hosts and credentials out of the snapshot', async () => {
    const clock = makeClock();
    const monitor = createHealthMonitor({
      probes: [probe({ id: 'mail', kind: 'external', run: async () => { throw new Error('connect ECONNREFUSED smtp.internal.example:587 user=admin pass=hunter2'); } })],
      now: clock.now,
    });
    const text = JSON.stringify(await monitor.snapshot());
    expect(text).not.toContain('hunter2');
    expect(text).not.toContain('smtp.internal.example');
    expect(text).not.toContain('admin');
    expect(text).toContain(FAILURE.UNREACHABLE);
  });

  it('only keeps short string detail from a probe', async () => {
    const clock = makeClock();
    const monitor = createHealthMonitor({
      probes: [probe({ id: 'a', run: async () => ({ detail: { secret: 'x' } }) })],
      now: clock.now,
    });
    expect((await monitor.snapshot()).services[0].detail).toBeNull();
  });
});

describe('health monitor caching and throttling', () => {
  it('does not re-run probes inside the cache window', async () => {
    const clock = makeClock();
    let runs = 0;
    const monitor = createHealthMonitor({ probes: [probe({ run: async () => { runs += 1; } })], now: clock.now, ttlMs: 60000 });
    await monitor.snapshot();
    clock.advance(30000);
    const second = await monitor.snapshot();
    expect(runs).toBe(1);
    expect(second.cache.refreshed).toBe(false);
    clock.advance(31000);
    await monitor.snapshot();
    expect(runs).toBe(2);
  });

  it('runs a probe with its own longer interval less often', async () => {
    const clock = makeClock();
    let core = 0;
    let external = 0;
    const monitor = createHealthMonitor({
      probes: [probe({ id: 'core', run: async () => { core += 1; } }), probe({ id: 'ext', kind: 'external', ttlMs: 300000, run: async () => { external += 1; } })],
      now: clock.now,
      ttlMs: 60000,
    });
    await monitor.snapshot();
    clock.advance(61000);
    await monitor.snapshot();
    expect(core).toBe(2);
    expect(external).toBe(1);
  });

  it('throttles forced re-checks and allows them after the minimum interval', async () => {
    const clock = makeClock();
    let runs = 0;
    const monitor = createHealthMonitor({ probes: [probe({ run: async () => { runs += 1; } })], now: clock.now, forceMinIntervalMs: 15000 });
    await monitor.snapshot();
    clock.advance(5000);
    const throttled = await monitor.snapshot({ force: true });
    expect(throttled.cache.throttled).toBe(true);
    expect(runs).toBe(1);
    clock.advance(11000);
    await monitor.snapshot({ force: true });
    expect(runs).toBe(2);
  });

  it('runs a probe once when several requests arrive together', async () => {
    const clock = makeClock();
    let runs = 0;
    const monitor = createHealthMonitor({ probes: [probe({ run: async () => { runs += 1; await new Promise((r) => setTimeout(r, 10)); } })], now: clock.now });
    await Promise.all([monitor.snapshot(), monitor.snapshot(), monitor.snapshot()]);
    expect(runs).toBe(1);
  });
});

describe('health monitor history', () => {
  it('computes the recent success rate and caps the failure log', async () => {
    const clock = makeClock();
    let calls = 0;
    const monitor = createHealthMonitor({
      probes: [probe({ run: async () => { calls += 1; if (calls % 2 === 0) throw new Error('x'); } })],
      now: clock.now,
      ttlMs: 1000,
      failureLogSize: 3,
    });
    let snap;
    for (let i = 0; i < 8; i += 1) {
      snap = await monitor.snapshot();
      clock.advance(1500);
    }
    expect(snap.services[0].recentChecks).toBe(8);
    expect(snap.services[0].recentSuccessRatePercent).toBe(50);
    expect(snap.recentFailures.length).toBe(3);
  });
});

describe('classifyError', () => {
  it('maps errors to fixed categories', () => {
    expect(classifyError(Object.assign(new Error('x'), { code: 'ETIMEDOUT' }))).toBe(FAILURE.TIMEOUT);
    expect(classifyError(Object.assign(new Error('x'), { code: 'EAUTH' }))).toBe(FAILURE.AUTH_FAILED);
    expect(classifyError(new Error('getaddrinfo ENOTFOUND host'))).toBe(FAILURE.UNREACHABLE);
    expect(classifyError(new ProbeFailure(FAILURE.BAD_RESPONSE))).toBe(FAILURE.BAD_RESPONSE);
    expect(classifyError(new Error('anything else'))).toBe(FAILURE.ERROR);
    expect(classifyError(undefined)).toBe(FAILURE.ERROR);
  });
});

describe('request metrics', () => {
  const fakeRes = (status) => {
    const handlers = [];
    return { statusCode: status, on: (event, fn) => handlers.push(fn), finish: () => handlers.forEach((fn) => fn()) };
  };
  const run = (metrics, path, status) => {
    const res = fakeRes(status);
    metrics.middleware({ originalUrl: path }, res, () => {});
    res.finish();
  };

  it('counts requests and server errors, ignoring health endpoints', () => {
    const clock = makeClock();
    const metrics = createRequestMetrics({ now: clock.now });
    run(metrics, '/api/expenses?month=2026-11', 200);
    run(metrics, '/api/expenses', 500);
    run(metrics, '/api/expenses', 404);
    run(metrics, '/api/health', 200);
    run(metrics, '/api/admin/health', 200);
    run(metrics, '/api/admin/health/check', 200);
    expect(metrics.summary()).toEqual({ windowMinutes: 15, total: 3, serverErrors: 1, errorRatePercent: 33.3 });
  });

  it('forgets requests older than the window', () => {
    const clock = makeClock();
    const metrics = createRequestMetrics({ now: clock.now, windowMinutes: 15 });
    run(metrics, '/api/x', 500);
    clock.advance(16 * 60000);
    expect(metrics.summary()).toEqual({ windowMinutes: 15, total: 0, serverErrors: 0, errorRatePercent: null });
  });
});
