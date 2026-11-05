import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';
import { allowedOrigins } from '../../src/middleware/security.js';

const { default: app } = await import('../../src/app.js');

describe('origin guard on state-changing requests', () => {
  it('rejects a POST that comes from an origin that is not allowed', async () => {
    const res = await request(app).post('/api/auth/logout').set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
  });

  it('rejects a DELETE from an unknown origin', async () => {
    const res = await request(app).delete('/api/users/me/sessions/abc').set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
  });

  it('lets an allowed origin through to the normal checks', async () => {
    const [origin] = allowedOrigins();
    const res = await request(app).post('/api/auth/logout').set('Origin', origin);
    expect(res.status).not.toBe(403);
  });

  it('lets requests with no Origin header through (non-browser clients)', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).not.toBe(403);
  });

  it('does not block read requests from other origins at this layer', async () => {
    const res = await request(app).get('/api/security/events').set('Origin', 'https://evil.example');
    expect(res.status).not.toBe(403);
  });
});
