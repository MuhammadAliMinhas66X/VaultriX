import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';
import { createAuthedUser } from './helpers.js';
import User from '../../src/models/User.js';
import Expense from '../../src/models/Expense.js';
import Invite from '../../src/models/Invite.js';

const { default: app } = await import('../../src/app.js');

const api = (user) => ({
  get: (url) => request(app).get(url).set('Authorization', user.authorization),
  post: (url, body) => request(app).post(url).set('Authorization', user.authorization).send(body),
  patch: (url, body) => request(app).patch(url).set('Authorization', user.authorization).send(body),
  del: (url) => request(app).delete(url).set('Authorization', user.authorization),
});

describe('inviting a second person', () => {
  it('invite, join with the code, change role, remove', async () => {
    const owner = await createAuthedUser({ email: 'own1@vaultrix.test', name: 'Owner One' });
    const guest = await createAuthedUser({ email: 'guest1@vaultrix.test', name: 'Guest One' });

    const made = await api(owner).post('/api/team/invites', { email: 'guest1@vaultrix.test', role: 'member' });
    expect(made.status).toBe(201);
    expect(made.body.code).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
    expect((await api(owner).post('/api/team/invites', { email: 'guest1@vaultrix.test', role: 'member' })).status).toBe(409);

    // wrong person, wrong code
    const stranger = await createAuthedUser({ email: 'nope1@vaultrix.test' });
    expect((await api(stranger).post('/api/team/join', { code: made.body.code })).status).toBe(400);
    expect((await api(guest).post('/api/team/join', { code: 'AAAAA-AAAAA' })).status).toBe(400);

    const joined = await api(guest).post('/api/team/join', { code: made.body.code.toLowerCase() });
    expect(joined.status).toBe(200);
    const saved = await User.findOne({ email: 'guest1@vaultrix.test' });
    expect(String(saved.orgId)).toBe(String(owner.user.orgId));
    expect(saved.role).toBe('member');
    expect(await Invite.countDocuments({ orgId: owner.user.orgId })).toBe(0);

    // the code is single use
    expect((await api(guest).post('/api/team/join', { code: made.body.code })).status).toBeGreaterThanOrEqual(400);

    const team = await api(owner).get('/api/team');
    expect(team.body.members.map((m) => m.email).sort()).toEqual(['guest1@vaultrix.test', 'own1@vaultrix.test']);

    // a member cannot invite or change roles
    expect((await api(guest).post('/api/team/invites', { email: 'x1@vaultrix.test', role: 'viewer' })).status).toBe(403);
    expect((await api(guest).patch(`/api/team/members/${owner.user.id}`, { role: 'viewer' })).status).toBe(403);

    const memberId = String(saved._id);
    expect((await api(owner).patch(`/api/team/members/${memberId}`, { role: 'viewer' })).status).toBe(200);
    // a viewer cannot write money data
    const blocked = await api(guest).post('/api/expenses', { amount: 5, currency: 'PKR', spentAt: new Date().toISOString().slice(0, 10) });
    expect(blocked.status).toBe(403);

    expect((await api(owner).patch(`/api/team/members/${owner.user.id}`, { role: 'viewer' })).status).toBe(400);
    expect((await api(owner).del(`/api/team/members/${memberId}`)).status).toBe(200);
    const after = await User.findById(memberId);
    expect(String(after.orgId)).not.toBe(String(owner.user.orgId));
    expect(after.role).toBe('owner');
  });

  it('refuses to join when the account already has data, and keeps workspaces apart', async () => {
    const owner = await createAuthedUser({ email: 'own2@vaultrix.test' });
    const guest = await createAuthedUser({ email: 'guest2@vaultrix.test' });
    await Expense.create({ orgId: guest.user.orgId, amountMinor: 100, currency: 'PKR', spentAt: new Date() });
    const made = await api(owner).post('/api/team/invites', { email: 'guest2@vaultrix.test', role: 'viewer' });
    const res = await api(guest).post('/api/team/join', { code: made.body.code });
    expect(res.status).toBe(409);

    // another workspace's invite cannot be revoked by someone else
    const other = await createAuthedUser({ email: 'other2@vaultrix.test' });
    expect((await api(other).del(`/api/team/invites/${made.body.invite.id}`)).status).toBe(404);
    expect((await api(owner).del(`/api/team/invites/${made.body.invite.id}`)).status).toBe(200);
  });

  it('a member can leave, the owner cannot', async () => {
    const owner = await createAuthedUser({ email: 'own3@vaultrix.test' });
    const guest = await createAuthedUser({ email: 'guest3@vaultrix.test' });
    const made = await api(owner).post('/api/team/invites', { email: 'guest3@vaultrix.test', role: 'admin' });
    await api(guest).post('/api/team/join', { code: made.body.code });
    expect((await api(owner).post('/api/team/leave', {})).status).toBe(400);
    expect((await api(guest).post('/api/team/leave', {})).status).toBe(200);
    const after = await User.findOne({ email: 'guest3@vaultrix.test' });
    expect(String(after.orgId)).not.toBe(String(owner.user.orgId));
  });
});
