import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import { lastCodeTo } from './mailerMock.js';

const { default: app } = await import('../../src/app.js');

// A fixed, valid-looking device cookie value so every request in a test can
// be pinned to the SAME simulated device - attachDeviceId() only generates
// a random one when no existing vx_did cookie is sent, so setting our own
// here stands in for "the same browser, every request".
const SAME_DEVICE_COOKIE = 'vx_did=11111111-1111-1111-1111-111111111111';
const OTHER_DEVICE_COOKIE = 'vx_did=22222222-2222-2222-2222-222222222222';

const VALID_PASSWORD = 'Sup3r!Secret';
const REAL_DOMAIN = 'gmail.com'; // signup() does a real DNS check - see auth.test.js for why.

const signUpOneAccount = async (cookie, index) => {
  const email = `device.limit.${index}.${Date.now()}@${REAL_DOMAIN}`;
  const signupRes = await request(app)
    .post('/api/auth/signup')
    .set('Cookie', cookie)
    .send({ name: `Device Test ${index}`, email, password: VALID_PASSWORD });

  if (signupRes.status !== 200) return signupRes;

  const code = lastCodeTo(email);
  return request(app).post('/api/auth/signup/verify').set('Cookie', cookie).send({ email, code });
};

describe('Per-device account creation limit', () => {
  it('allows up to 3 accounts from the same device, then blocks the 4th', async () => {
    for (let i = 1; i <= 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await signUpOneAccount(SAME_DEVICE_COOKIE, i);
      expect(res.status).toBe(201);
    }

    const email = `device.limit.4.${Date.now()}@${REAL_DOMAIN}`;
    const blocked = await request(app)
      .post('/api/auth/signup')
      .set('Cookie', SAME_DEVICE_COOKIE)
      .send({ name: 'Device Test 4', email, password: VALID_PASSWORD });

    expect(blocked.status).toBe(400);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.message).toMatch(/maximum number/i);
  });

  it('a different device is not affected by another device being at its limit', async () => {
    const email = `device.other.${Date.now()}@${REAL_DOMAIN}`;
    const res = await request(app)
      .post('/api/auth/signup')
      .set('Cookie', OTHER_DEVICE_COOKIE)
      .send({ name: 'Other Device', email, password: VALID_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
