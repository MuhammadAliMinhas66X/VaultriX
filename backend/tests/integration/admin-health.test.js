import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';
import { createUser, authHeaderFor } from './helpers.js';
import { ADMIN_EMAIL } from '../../src/config/env.js';

// No real network in tests: the exchange-rate probe reads a stubbed table.
vi.mock('../../src/services/exchangeRateService.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    getRateTable: vi.fn(async () => ({ rates: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`C${i}`, 1])) })),
  };
});

const { default: app } = await import('../../src/app.js');

const SENSITIVE = /(password|secret|token|api[_-]?key|mongodb(\+srv)?:\/\/|smtp\.|cloudinary:\/\/)/i;

describe('admin system health', () => {
  it('rejects requests with no session', async () => {
    expect((await request(app).get('/api/admin/health')).status).toBe(401);
    expect((await request(app).post('/api/admin/health/check')).status).toBe(401);
  });

  it('hides the endpoints from a normal signed-in user', async () => {
    const user = await createUser({ email: 'member@vaultrix.test' });
    const { authorization } = await authHeaderFor(user);
    expect((await request(app).get('/api/admin/health').set('Authorization', authorization)).status).toBe(404);
    expect((await request(app).post('/api/admin/health/check').set('Authorization', authorization)).status).toBe(404);
  });

  it('gives the admin a snapshot of the real services with no sensitive data', async () => {
    const admin = await createUser({ email: ADMIN_EMAIL });
    const { authorization } = await authHeaderFor(admin);
    const res = await request(app).get('/api/admin/health').set('Authorization', authorization);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(['ok', 'degraded', 'down']).toContain(res.body.overall);

    const byId = Object.fromEntries(res.body.services.map((s) => [s.id, s]));
    expect(Object.keys(byId).sort()).toEqual(['backend', 'cloudinary', 'database', 'email', 'exchangeRates']);
    expect(byId.database.status).toBe('ok');
    expect(byId.backend.status).toBe('ok');
    expect(byId.exchangeRates.status).toBe('ok');
    // Not configured in the test environment, so reported as such, not failed.
    expect(byId.email.status).toBe('not_configured');
    expect(byId.cloudinary.status).toBe('not_configured');

    expect(JSON.stringify(res.body)).not.toMatch(SENSITIVE);
  });

  it('lets the admin trigger a check, and throttles repeats', async () => {
    const admin = await createUser({ email: ADMIN_EMAIL });
    const { authorization } = await authHeaderFor(admin);
    await request(app).get('/api/admin/health').set('Authorization', authorization);
    const res = await request(app).post('/api/admin/health/check').set('Authorization', authorization);
    expect(res.status).toBe(200);
    expect(res.body.cache.throttled).toBe(true);
  });
});

describe('public liveness endpoint', () => {
  it('stays minimal and unauthenticated', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
