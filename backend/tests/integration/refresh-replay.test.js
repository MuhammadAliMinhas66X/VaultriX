import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';
import { createAuthedUser } from './helpers.js';
import Session from '../../src/models/Session.js';
import { signRefreshToken } from '../../src/utils/tokens.js';

const { default: app } = await import('../../src/app.js');

const cookieValue = (res) => {
  const header = (res.headers['set-cookie'] || []).find((item) => item.startsWith('vaultrix_refresh='));
  return header ? header.split(';')[0].split('=')[1] : null;
};

const refreshWith = (token) => request(app).post('/api/auth/refresh').set('Cookie', `vaultrix_refresh=${token}`);

describe('refresh token replay', () => {
  it('rotates the token and accepts the new one', async () => {
    const { user, sessionId } = await createAuthedUser({ email: 'rotate@vaultrix.test' });
    const first = await refreshWith(signRefreshToken(user, sessionId, 0));
    expect(first.status).toBe(200);
    const next = cookieValue(first);
    expect(next).toBeTruthy();
    const second = await refreshWith(next);
    expect(second.status).toBe(200);
  });

  it('lets an old token through for a moment (two tabs at once)', async () => {
    const { user, sessionId } = await createAuthedUser({ email: 'tabs@vaultrix.test' });
    const old = signRefreshToken(user, sessionId, 0);
    expect((await refreshWith(old)).status).toBe(200);
    expect((await refreshWith(old)).status).toBe(200);
  });

  it('closes the session when an old token is replayed later', async () => {
    const { user, sessionId } = await createAuthedUser({ email: 'replay@vaultrix.test' });
    const old = signRefreshToken(user, sessionId, 0);
    expect((await refreshWith(old)).status).toBe(200);
    await Session.updateOne({ _id: sessionId }, { refreshRotatedAt: new Date(Date.now() - 5 * 60 * 1000) });
    const replay = await refreshWith(old);
    expect(replay.status).toBe(401);
    expect(await Session.exists({ _id: sessionId })).toBeNull();
  });

  it('rejects a token from the future', async () => {
    const { user, sessionId } = await createAuthedUser({ email: 'future@vaultrix.test' });
    const res = await refreshWith(signRefreshToken(user, sessionId, 5));
    expect(res.status).toBe(401);
  });
});
