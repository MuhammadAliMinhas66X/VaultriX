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
  post: (url, body) => request(app).post(url).set('Authorization', user.authorization).send(body),
  del: (url) => request(app).delete(url).set('Authorization', user.authorization),
});

describe('budgets', () => {
  it('keeps one limit per category, refuses foreign or income categories and removes', async () => {
    const ali = await createAuthedUser({ email: 'bdali@vaultrix.test', name: 'Ali' });
    const other = await createAuthedUser({ email: 'bdother@vaultrix.test', name: 'Other' });
    const food = await Category.create({ orgId: ali.user.orgId, name: 'Food', type: 'expense' });
    const pay = await Category.create({ orgId: ali.user.orgId, name: 'Pay', type: 'income' });
    const foreign = await Category.create({ orgId: other.user.orgId, name: 'Theirs', type: 'expense' });

    const first = await as(ali).put('/api/budgets', { categoryId: String(food._id), amount: 20000, currency: 'PKR' });
    expect(first.status).toBe(200);
    const second = await as(ali).put('/api/budgets', { categoryId: String(food._id), amount: 25000.5, currency: 'PKR' });
    expect(second.body.budget.id).toBe(first.body.budget.id);
    const list = await as(ali).get('/api/budgets');
    expect(list.body.budgets).toHaveLength(1);
    expect(list.body.budgets[0].amount).toBe(25000.5);
    expect((await as(other).get('/api/budgets')).body.budgets).toEqual([]);

    expect((await as(ali).put('/api/budgets', { categoryId: String(pay._id), amount: 5, currency: 'PKR' })).status).toBe(400);
    expect((await as(ali).put('/api/budgets', { categoryId: String(foreign._id), amount: 5, currency: 'PKR' })).status).toBe(400);
    expect((await as(ali).put('/api/budgets', { categoryId: String(food._id), amount: -5, currency: 'PKR' })).status).toBe(400);
    expect((await as(other).del(`/api/budgets/${first.body.budget.id}`)).status).toBe(404);
    expect((await as(ali).del(`/api/budgets/${first.body.budget.id}`)).status).toBe(200);
    expect((await as(ali).get('/api/budgets')).body.budgets).toEqual([]);
  });
});

describe('goals', () => {
  it('creates a goal, adds and takes out money, never goes below zero, and removes', async () => {
    const ali = await createAuthedUser({ email: 'glali@vaultrix.test', name: 'Ali' });
    const other = await createAuthedUser({ email: 'glother@vaultrix.test', name: 'Other' });

    const made = await as(ali).post('/api/goals', { name: 'Laptop', target: 150000, currency: 'PKR', deadline: '2027-06-30' });
    expect(made.status).toBe(201);
    const id = made.body.goal.id;
    expect(made.body.goal).toMatchObject({ name: 'Laptop', target: 150000, saved: 0, deadline: '2027-06-30' });

    const put = await as(ali).post(`/api/goals/${id}/contributions`, { amount: 40000, direction: 'in', note: 'Bonus' });
    expect(put.body.goal.saved).toBe(40000);
    const took = await as(ali).post(`/api/goals/${id}/contributions`, { amount: 10000, direction: 'out' });
    expect(took.body.goal.saved).toBe(30000);
    expect((await as(ali).post(`/api/goals/${id}/contributions`, { amount: 99999, direction: 'out' })).status).toBe(400);
    expect((await as(ali).post(`/api/goals/${id}/contributions`, { amount: 0 })).status).toBe(400);

    const rows = took.body.goal.contributions;
    const bonus = rows.find((row) => row.note === 'Bonus');
    expect((await as(ali).del(`/api/goals/${id}/contributions/${bonus.id}`)).status).toBe(400);

    expect((await as(other).post(`/api/goals/${id}/contributions`, { amount: 5 })).status).toBe(404);
    expect((await as(other).get('/api/goals')).body.goals).toEqual([]);
    expect((await as(ali).post('/api/goals', { name: '', target: 5, currency: 'PKR' })).status).toBe(400);
    expect((await as(ali).del(`/api/goals/${id}`)).status).toBe(200);
  });

  it('lets a viewer read but not write', async () => {
    const ali = await createAuthedUser({ email: 'glowner@vaultrix.test', name: 'Ali' });
    const viewer = await createAuthedUser({ email: 'glviewer@vaultrix.test', name: 'V', orgId: ali.user.orgId, role: 'viewer' });
    expect((await as(viewer).get('/api/goals')).status).toBe(200);
    expect((await as(viewer).post('/api/goals', { name: 'X', target: 5, currency: 'PKR' })).status).toBe(403);
  });
});
