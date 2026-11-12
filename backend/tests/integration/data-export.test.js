import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';
import { createAuthedUser } from './helpers.js';
import Expense from '../../src/models/Expense.js';
import Category from '../../src/models/Category.js';

const { default: app } = await import('../../src/app.js');

const today = () => new Date().toISOString().slice(0, 10);

describe('export and import', () => {
  it('exports expenses as CSV for the signed-in account only', async () => {
    const owner = await createAuthedUser({ email: 'ex1@vaultrix.test' });
    const other = await createAuthedUser({ email: 'ex2@vaultrix.test' });
    await Expense.create({ orgId: owner.user.orgId, amountMinor: 12050, currency: 'PKR', spentAt: new Date(), note: '=SUM(A1)' });
    await Expense.create({ orgId: other.user.orgId, amountMinor: 999, currency: 'PKR', spentAt: new Date(), note: 'secret' });

    const res = await request(app).get('/api/data/export/expenses').set('Authorization', owner.authorization);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('120.5');
    expect(res.text).toContain("'=SUM(A1)");
    expect(res.text).not.toContain('secret');
  });

  it('refuses an unknown export kind and a missing sign in', async () => {
    const owner = await createAuthedUser({ email: 'ex3@vaultrix.test' });
    expect((await request(app).get('/api/data/export/users').set('Authorization', owner.authorization)).status).toBe(404);
    expect((await request(app).get('/api/data/export/expenses')).status).toBe(401);
  });

  it('imports expenses, maps categories by name, skips bad rows and duplicates', async () => {
    const owner = await createAuthedUser({ email: 'im1@vaultrix.test' });
    const category = await Category.create({ orgId: owner.user.orgId, name: 'Food', type: 'expense' });
    const send = (rows) => request(app).post('/api/data/import/expenses').set('Authorization', owner.authorization).send({ rows });
    const rows = [
      { row: 2, date: today(), amount: '250.50', currency: 'PKR', category: 'food', note: 'Lunch' },
      { row: 3, date: 'nope', amount: '10', currency: 'PKR', category: '', note: '' },
      { row: 4, date: today(), amount: '-5', currency: 'PKR', category: '', note: '' },
    ];
    const first = await send(rows);
    expect(first.status).toBe(201);
    expect(first.body.created).toBe(1);
    expect(first.body.skipped.map((item) => item.row).sort()).toEqual([3, 4]);
    const saved = await Expense.findOne({ orgId: owner.user.orgId });
    expect(String(saved.categoryId)).toBe(String(category._id));
    expect(saved.amountMinor).toBe(25050);

    const again = await send([rows[0]]);
    expect(again.body.created).toBe(0);
    expect(again.body.skipped[0].reason).toBe('duplicate');
  });

  it('a viewer cannot import, and too many rows are refused', async () => {
    const viewer = await createAuthedUser({ email: 'im2@vaultrix.test', role: 'viewer' });
    const post = (user, rows) => request(app).post('/api/data/import/expenses').set('Authorization', user.authorization).send({ rows });
    expect((await post(viewer, [{ date: today(), amount: '1', currency: 'PKR' }])).status).toBe(403);
    const owner = await createAuthedUser({ email: 'im3@vaultrix.test' });
    const many = Array.from({ length: 101 }, (_, i) => ({ row: i + 2, date: today(), amount: '1', currency: 'PKR' }));
    expect((await post(owner, many)).status).toBe(400);
  });
});
