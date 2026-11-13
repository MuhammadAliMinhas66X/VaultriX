import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';
import { createAuthedUser } from './helpers.js';
import Expense from '../../src/models/Expense.js';

const { default: app } = await import('../../src/app.js');

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

describe('repeating expenses', () => {
  it('makes the missed copies once, and stops when set to none', async () => {
    const owner = await createAuthedUser({ email: 'rep1@vaultrix.test' });
    const org = owner.user.orgId;
    const post = (body) => request(app).post('/api/expenses').set('Authorization', owner.authorization).send(body);
    const month = daysAgo(0).slice(0, 7);

    const made = await post({ amount: 100, currency: 'PKR', spentAt: daysAgo(3), note: 'Gym', repeat: 'daily', paidBy: 'self' });
    expect(made.status).toBe(201);
    expect(made.body.expense.repeat).toBe('daily');

    await request(app).get(`/api/expenses?month=${month}`).set('Authorization', owner.authorization);
    await request(app).get(`/api/expenses?month=${month}`).set('Authorization', owner.authorization);
    expect(await Expense.countDocuments({ orgId: org, repeatOf: { $ne: null } })).toBeGreaterThanOrEqual(2);
    const before = await Expense.countDocuments({ orgId: org });
    await request(app).get(`/api/expenses?month=${month}`).set('Authorization', owner.authorization);
    expect(await Expense.countDocuments({ orgId: org })).toBe(before);

    const stop = await request(app).patch(`/api/expenses/${made.body.expense.id}`).set('Authorization', owner.authorization).send({ repeat: 'none' });
    expect(stop.status).toBe(200);
    expect(stop.body.expense.repeat).toBe('none');
  });

  it('a borrowed expense cannot repeat', async () => {
    const owner = await createAuthedUser({ email: 'rep2@vaultrix.test' });
    const res = await request(app).post('/api/expenses').set('Authorization', owner.authorization).send({ amount: 5, currency: 'PKR', spentAt: daysAgo(1), repeat: 'weekly', paidBy: 'other', payerName: 'Ali' });
    expect(res.status).toBe(400);
  });
});
