import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';
import { createAuthedUser } from './helpers.js';

const { default: app } = await import('../../src/app.js');
const as = (user) => ({
  get: (url) => request(app).get(url).set('Authorization', user.authorization),
  put: (url, body) => request(app).put(url).set('Authorization', user.authorization).send(body),
  post: (url, body) => request(app).post(url).set('Authorization', user.authorization).send(body),
  del: (url) => request(app).delete(url).set('Authorization', user.authorization),
});
const good = { name: 'Office kameti', currency: 'PKR', contribution: 5000, size: 4, mySlot: 2, startDate: '2026-01-05', frequency: 'monthly' };

describe('committees', () => {
  it('creates one, shows its rounds and refuses bad details', async () => {
    const ali = await createAuthedUser({ email: 'cmali@vaultrix.test', name: 'Ali' });
    const made = await as(ali).post('/api/committees?today=2026-03-05', good);
    expect(made.status).toBe(201);
    expect(made.body.committee).toMatchObject({ size: 4, total: 20000, payout: 20000, payoutDay: '2026-02-05', payoutStatus: 'ready' });
    expect(made.body.committee.rounds.map((item) => item.status)).toEqual(['overdue', 'overdue', 'due', 'upcoming']);
    for (const bad of [{ ...good, name: '' }, { ...good, contribution: 0 }, { ...good, size: 1 }, { ...good, mySlot: 5 }, { ...good, frequency: 'daily' }, { ...good, currency: 'XXX' }, { ...good, startDate: 'soon' }]) {
      expect((await as(ali).post('/api/committees', bad)).status).toBe(400);
    }
  });

  it('records a payment once, undoes it, and records the payout once', async () => {
    const ali = await createAuthedUser({ email: 'cmpay@vaultrix.test', name: 'Ali' });
    const id = (await as(ali).post('/api/committees', good)).body.committee.id;
    const first = await as(ali).post(`/api/committees/${id}/payments`, { round: 1, date: '2026-01-05' });
    expect(first.status).toBe(200);
    expect(first.body.committee.paidCount).toBe(1);
    expect((await as(ali).post(`/api/committees/${id}/payments`, { round: 1 })).status).toBe(400);
    expect((await as(ali).post(`/api/committees/${id}/payments`, { round: 9 })).status).toBe(400);
    const both = await Promise.all([as(ali).post(`/api/committees/${id}/payments`, { round: 2 }), as(ali).post(`/api/committees/${id}/payments`, { round: 2 })]);
    expect(both.map((res) => res.status).sort()).toEqual([200, 400]);
    expect((await as(ali).del(`/api/committees/${id}/payments/2`)).body.committee.paidCount).toBe(1);
    expect((await as(ali).post(`/api/committees/${id}/payout`, { date: '2026-02-06' })).body.committee.payoutStatus).toBe('received');
    expect((await as(ali).post(`/api/committees/${id}/payout`, {})).status).toBe(400);
    expect((await as(ali).del(`/api/committees/${id}/payout`)).body.committee.payoutReceivedAt).toBeNull();
  });

  it('locks the money and rhythm once something is paid, but still lets the name and slot change', async () => {
    const ali = await createAuthedUser({ email: 'cmlock@vaultrix.test', name: 'Ali' });
    const id = (await as(ali).post('/api/committees', good)).body.committee.id;
    await as(ali).post(`/api/committees/${id}/payments`, { round: 1, date: '2026-01-05' });
    expect((await as(ali).put(`/api/committees/${id}`, { ...good, contribution: 9000 })).status).toBe(400);
    const renamed = await as(ali).put(`/api/committees/${id}`, { ...good, name: 'Renamed', mySlot: 3 });
    expect(renamed.status).toBe(200);
    expect(renamed.body.committee).toMatchObject({ name: 'Renamed', mySlot: 3 });
  });

  it('keeps committees private and removes them', async () => {
    const ali = await createAuthedUser({ email: 'cmown@vaultrix.test', name: 'Ali' });
    const other = await createAuthedUser({ email: 'cmoth@vaultrix.test', name: 'Other' });
    const id = (await as(ali).post('/api/committees', good)).body.committee.id;
    expect((await as(other).get('/api/committees')).body.committees).toEqual([]);
    expect((await as(other).post(`/api/committees/${id}/payments`, { round: 1 })).status).toBe(404);
    expect((await as(other).del(`/api/committees/${id}`)).status).toBe(404);
    expect((await as(ali).del(`/api/committees/${id}`)).status).toBe(200);
    expect((await as(ali).get('/api/committees')).body.committees).toEqual([]);
  });

  it('lets an organizer name members, tick who paid, draw winners and hand the pot over', async () => {
    const ali = await createAuthedUser({ email: 'cmorg@vaultrix.test', name: 'Ali' });
    const made = await as(ali).post('/api/committees?today=2026-02-10', { ...good, role: 'organizer', mySlot: 1, memberNames: ['Sara', 'Omar'] });
    expect(made.status).toBe(201);
    const id = made.body.committee.id;
    const [sara, omar] = made.body.committee.members;
    expect(made.body.committee).toMatchObject({ role: 'organizer', missingNames: 1, lateMembers: 2 });
    // one more name fits (size 4 = me + 3), a fourth does not
    expect((await as(ali).post(`/api/committees/${id}/members`, { name: 'Zain' })).status).toBe(201);
    expect((await as(ali).post(`/api/committees/${id}/members`, { name: 'Extra' })).status).toBe(400);
    // a payment is recorded once, even on a double tap
    const taps = await Promise.all([1, 2].map(() => as(ali).post(`/api/committees/${id}/members/${sara.id}/payments`, { round: 1, date: '2026-01-05' })));
    expect(taps.map((tap) => tap.status).sort()).toEqual([200, 400]);
    // mark everyone for round 1, then everyone has paid except me
    const all = await as(ali).post(`/api/committees/${id}/rounds/1/collect`, { date: '2026-01-05' });
    expect(all.body.committee.rounds[0].collected).toBe(3);
    // draw: Sara takes round 2, then Omar takes it instead and Sara is freed
    expect((await as(ali).put(`/api/committees/${id}/rounds/2/winner`, { holder: sara.id })).body.committee.members.find((m) => m.id === sara.id).slot).toBe(2);
    const swapped = await as(ali).put(`/api/committees/${id}/rounds/2/winner`, { holder: omar.id });
    expect(swapped.body.committee.members.find((m) => m.id === sara.id).slot).toBeNull();
    expect(swapped.body.committee.members.find((m) => m.id === omar.id).slot).toBe(2);
    // the pot goes out once; a handed-over round cannot be re-drawn; a person with history cannot be removed
    expect((await as(ali).post(`/api/committees/${id}/rounds/2/handover`, { date: '2026-02-06' })).status).toBe(200);
    expect((await as(ali).post(`/api/committees/${id}/rounds/2/handover`, {})).status).toBe(400);
    expect((await as(ali).put(`/api/committees/${id}/rounds/2/winner`, { holder: sara.id })).status).toBe(400);
    expect((await as(ali).del(`/api/committees/${id}/members/${omar.id}`)).status).toBe(400);
    expect((await as(ali).del(`/api/committees/${id}/members/${sara.id}/payments/1`)).status).toBe(200);
  });

  it('keeps another account away from the members', async () => {
    const ali = await createAuthedUser({ email: 'cmmem@vaultrix.test', name: 'Ali' });
    const other = await createAuthedUser({ email: 'cmmemo@vaultrix.test', name: 'Other' });
    const made = await as(ali).post('/api/committees', { ...good, role: 'organizer', memberNames: ['Sara'] });
    const id = made.body.committee.id;
    const sara = made.body.committee.members[0];
    expect((await as(other).post(`/api/committees/${id}/members/${sara.id}/payments`, { round: 1 })).status).toBe(404);
    expect((await as(other).put(`/api/committees/${id}/rounds/1/winner`, { holder: 'me' })).status).toBe(404);
  });
});
