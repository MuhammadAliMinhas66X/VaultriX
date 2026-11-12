import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';

const { default: app } = await import('../../src/app.js');

// Express 4.21+ re-sets a cookie for its full lifetime if res.clearCookie is
// given `maxAge`, instead of deleting it. The cookie options used to SET the
// refresh cookie include maxAge, so clearing must use a copy without it.
describe('logout clears the refresh cookie', () => {
  it('expires it immediately instead of re-setting it for 30 days', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);

    const cookie = (res.headers['set-cookie'] || []).find((value) => value.startsWith('vaultrix_refresh='));
    expect(cookie).toBeTruthy();
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(cookie).not.toMatch(/Max-Age/i);
    expect(cookie).toMatch(/HttpOnly/);
  });
});
