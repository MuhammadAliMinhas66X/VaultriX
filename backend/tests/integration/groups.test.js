import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';
import { createAuthedUser } from './helpers.js';
import Expense from '../../src/models/Expense.js';

const { default: app } = await import('../../src/app.js');

const api = (user) => ({
  get: (url) => request(app).get(url).set('Authorization', user.authorization),
  post: (url, body) => request(app).post(url).set('Authorization', user.authorization).send(body || {}),
  patch: (url, body) => request(app).patch(url).set('Authorization', user.authorization).send(body || {}),
  del: (url) => request(app).delete(url).set('Authorization', user.authorization),
});
const today = () => new Date().toISOString().slice(0, 10);

describe('shared groups', () => {
  it('two people with private workspaces split a cost, settle and stay private', async () => {
    const ali = await createAuthedUser({ email: 'gali@vaultrix.test', name: 'Ali' });
    const sara = await createAuthedUser({ email: 'gsara@vaultrix.test', name: 'Sara' });
    const spy = await createAuthedUser({ email: 'gspy@vaultrix.test', name: 'Spy' });
    await Expense.create({ orgId: ali.user.orgId, amountMinor: 999, currency: 'PKR', spentAt: new Date(), note: 'private' });

    const made = await api(ali).post('/api/groups', { name: 'Flat 4B', currency: 'PKR' });
    expect(made.status).toBe(201);
    const id = made.body.id;

    const invite = await api(ali).post(`/api/groups/${id}/invites`, { email: 'gsara@vaultrix.test' });
    expect(invite.status).toBe(201);
    expect((await api(spy).post('/api/groups/join', { code: invite.body.code })).status).toBe(400);
    expect((await api(sara).post('/api/groups/join', { code: invite.body.code })).status).toBe(200);

    // outsiders cannot see the group
    expect((await api(spy).get(`/api/groups/${id}`)).status).toBe(404);

    // Ali pays rent 3001, split equally between both
    const rent = await api(ali).post(`/api/groups/${id}/expenses`, { description: 'Rent', amount: 3001, currency: 'PKR', spentAt: today(), paidBy: String(ali.user._id), splitType: 'equal', participants: [String(ali.user._id), String(sara.user._id)] });
    expect(rent.status).toBe(201);
    // exact split must add up
    const bad = await api(sara).post(`/api/groups/${id}/expenses`, { description: 'Food', amount: 100, currency: 'PKR', spentAt: today(), paidBy: String(sara.user._id), splitType: 'exact', shares: [{ userId: String(ali.user._id), amount: 10 }, { userId: String(sara.user._id), amount: 20 }] });
    expect(bad.status).toBe(400);

    const view = await api(sara).get(`/api/groups/${id}`);
    expect(view.body.expenses).toHaveLength(1);
    const pkr = view.body.balances.find((b) => b.currency === 'PKR');
    expect(pkr.transfers).toEqual([{ fromUserId: String(sara.user._id), toUserId: String(ali.user._id), amount: 1500.5 }]);

    // Sara cannot leave while she owes
    expect((await api(sara).post(`/api/groups/${id}/leave`)).status).toBe(400);
    const pay = await api(sara).post(`/api/groups/${id}/settlements`, { fromUserId: String(sara.user._id), toUserId: String(ali.user._id), amount: 1500.5, currency: 'PKR', paidAt: today() });
    expect(pay.status).toBe(201);
    const after = await api(ali).get(`/api/groups/${id}`);
    expect(after.body.balances.find((b) => b.currency === 'PKR').transfers).toEqual([]);

    // Sara copies her share into her own private expenses, once
    const eid = view.body.expenses[0].id;
    expect((await api(sara).post(`/api/groups/${id}/expenses/${eid}/my-expenses`)).status).toBe(201);
    expect((await api(sara).post(`/api/groups/${id}/expenses/${eid}/my-expenses`)).body.already).toBe(true);
    expect(await Expense.countDocuments({ orgId: sara.user.orgId })).toBe(1);
    // and Ali's private data never reached Sara
    expect(await Expense.countDocuments({ orgId: ali.user.orgId })).toBe(1);

    expect((await api(sara).post(`/api/groups/${id}/leave`)).status).toBe(200);
    expect((await api(ali).del(`/api/groups/${id}`)).status).toBe(200);
  });

  it('shows invitations by email and lets the invited person accept or decline without a code', async () => {
    const ali = await createAuthedUser({ email: 'iali@vaultrix.test', name: 'Ali' });
    const sara = await createAuthedUser({ email: 'isara@vaultrix.test', name: 'Sara' });
    const spy = await createAuthedUser({ email: 'ispy@vaultrix.test', name: 'Spy' });
    const id = (await api(ali).post('/api/groups', { name: 'Trip', currency: 'PKR' })).body.id;
    // invited before Sara has any chance to see it; the invite is stored by email
    await api(ali).post(`/api/groups/${id}/invites`, { email: 'isara@vaultrix.test' });

    const mine = await api(sara).get('/api/groups/invites/mine');
    expect(mine.status).toBe(200);
    expect(mine.body.invites).toHaveLength(1);
    expect(mine.body.invites[0].groupName).toBe('Trip');
    expect(mine.body.invites[0].inviterName).toBe('Ali');
    expect((await api(spy).get('/api/groups/invites/mine')).body.invites).toHaveLength(0);

    const inviteId = mine.body.invites[0].id;
    expect((await api(spy).post(`/api/groups/invites/${inviteId}/accept`)).status).toBe(404);
    expect((await api(spy).del(`/api/groups/invites/${inviteId}`)).status).toBe(404);
    const accepted = await api(sara).post(`/api/groups/invites/${inviteId}/accept`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.id).toBe(id);
    expect((await api(sara).get(`/api/groups/${id}`)).status).toBe(200);
    expect((await api(sara).get('/api/groups/invites/mine')).body.invites).toHaveLength(0);

    await api(ali).post(`/api/groups/${id}/invites`, { email: 'ispy@vaultrix.test' });
    const spyInvite = (await api(spy).get('/api/groups/invites/mine')).body.invites[0].id;
    expect((await api(spy).del(`/api/groups/invites/${spyInvite}`)).status).toBe(200);
    expect((await api(spy).get('/api/groups/invites/mine')).body.invites).toHaveLength(0);
  });
});
