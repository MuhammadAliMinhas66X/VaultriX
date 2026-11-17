import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';
import { createAuthedUser } from './helpers.js';
import Category from '../../src/models/Category.js';

const { default: app } = await import('../../src/app.js');
const as = (user) => ({
  get: (url) => request(app).get(url).set('Authorization', user.authorization),
  put: (url, body) => request(app).put(url).set('Authorization', user.authorization).send(body),
});

describe('salary plan', () => {
  it('saves a plan per month, keeps accounts apart and refuses bad input', async () => {
    const ali = await createAuthedUser({ email: 'spali@vaultrix.test', name: 'Ali' });
    const other = await createAuthedUser({ email: 'spother@vaultrix.test', name: 'Other' });
    const food = await Category.create({ orgId: ali.user.orgId, name: 'Food', type: 'expense' });
    const foreign = await Category.create({ orgId: other.user.orgId, name: 'Theirs', type: 'expense' });

    expect((await as(ali).get('/api/salary-plan/2026-11')).body.plan.lines).toEqual([]);
    const saved = await as(ali).put('/api/salary-plan/2026-11', { lines: [{ label: 'Rent', amount: 40000 }, { label: 'Food', amount: 15000.5, categoryId: String(food._id) }] });
    expect(saved.status).toBe(200);
    expect(saved.body.plan.lines.map((line) => line.amount)).toEqual([40000, 15000.5]);

    const again = await as(ali).put('/api/salary-plan/2026-11', { lines: [{ label: 'Rent', amount: 41000 }] });
    expect(again.body.plan.lines).toHaveLength(1);
    expect((await as(ali).get('/api/salary-plan/2026-11')).body.plan.lines[0].amount).toBe(41000);
    expect((await as(other).get('/api/salary-plan/2026-11')).body.plan.lines).toEqual([]);

    expect((await as(ali).put('/api/salary-plan/2026-13', { lines: [] })).status).toBe(400);
    expect((await as(ali).put('/api/salary-plan/2026-11', { lines: [{ label: '', amount: 5 }] })).status).toBe(400);
    expect((await as(ali).put('/api/salary-plan/2026-11', { lines: [{ label: 'X', amount: -5 }] })).status).toBe(400);
    expect((await as(ali).put('/api/salary-plan/2026-11', { lines: [{ label: 'X', amount: 5, categoryId: String(foreign._id) }] })).status).toBe(400);
    expect((await as(ali).put('/api/salary-plan/2026-11', { lines: 'no' })).status).toBe(400);
  });

  it('detaches a salary into the plan, logs it, and refuses a detach without an amount', async () => {
    const ali = await createAuthedUser({ email: 'spdetach@vaultrix.test', name: 'Ali' });
    const other = await createAuthedUser({ email: 'spdetachother@vaultrix.test', name: 'Other' });

    const first = await as(ali).put('/api/salary-plan/2026-12', { detached: true, salary: 120000, currency: 'PKR', lines: [{ label: 'Rent', amount: 40000 }] });
    expect(first.status).toBe(200);
    expect(first.body.plan).toMatchObject({ detached: true, salary: 120000, currency: 'PKR' });
    await as(ali).put('/api/salary-plan/2027-01', { detached: false, lines: [{ label: 'Food', amount: 100 }] });

    const logs = await as(ali).get('/api/salary-plan');
    expect(logs.body.plans.map((plan) => plan.month)).toEqual(['2026-12']);
    expect(logs.body.plans[0].planned).toBe(40000);
    expect((await as(other).get('/api/salary-plan')).body.plans).toEqual([]);

    expect((await as(ali).put('/api/salary-plan/2026-12', { detached: true, lines: [] })).status).toBe(400);
    expect((await as(ali).put('/api/salary-plan/2026-12', { detached: true, salary: 5, currency: 'XXX', lines: [] })).status).toBe(400);

    const back = await as(ali).put('/api/salary-plan/2026-12', { detached: false, lines: [{ label: 'Rent', amount: 40000 }] });
    expect(back.body.plan).toMatchObject({ detached: false, salary: 0, currency: null });
    expect((await as(ali).get('/api/salary-plan')).body.plans).toEqual([]);
  });

  it('keeps savings as its own kind and never ties it to an expense category', async () => {
    const ali = await createAuthedUser({ email: 'spkind@vaultrix.test', name: 'Ali' });
    const food = await Category.create({ orgId: ali.user.orgId, name: 'Food', type: 'expense' });
    const saved = await as(ali).put('/api/salary-plan/2027-01', {
      lines: [
        { label: 'Savings', amount: 30000, kind: 'savings', categoryId: String(food._id) },
        { label: 'Food', amount: 9000, kind: 'spend', categoryId: String(food._id) },
        { label: 'Old line', amount: 100 },
      ],
    });
    expect(saved.status).toBe(200);
    expect(saved.body.plan.lines.map((line) => [line.kind, line.categoryId])).toEqual([['savings', null], ['spend', String(food._id)], [null, null]]);
    expect((await as(ali).put('/api/salary-plan/2027-01', { lines: [{ label: 'X', amount: 5, kind: 'other' }] })).status).toBe(400);
  });
});
