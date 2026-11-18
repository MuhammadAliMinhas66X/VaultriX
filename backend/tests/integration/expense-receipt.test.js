import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';
import { createAuthedUser } from './helpers.js';
import Expense from '../../src/models/Expense.js';

const { default: app } = await import('../../src/app.js');

describe('expense receipt photo', () => {
  it('keeps receipts to the owning account and answers clearly when photo storage is off', async () => {
    const owner = await createAuthedUser({ email: 'rcowner@vaultrix.test', name: 'Owner' });
    const other = await createAuthedUser({ email: 'rcother@vaultrix.test', name: 'Other' });
    const expense = await Expense.create({ orgId: owner.user.orgId, createdBy: owner.user._id, amountMinor: 5000, currency: 'PKR', spentAt: new Date(), note: 'Lunch' });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const url = `/api/expenses/${expense._id}/receipt`;

    // another account cannot attach or remove
    expect((await request(app).post(url).set('Authorization', other.authorization).attach('image', png, { filename: 'r.png', contentType: 'image/png' })).status).toBe(404);
    expect((await request(app).delete(url).set('Authorization', other.authorization)).status).toBe(404);
    // no file
    expect((await request(app).post(url).set('Authorization', owner.authorization)).status).toBe(400);
    // photo storage is not configured in tests
    expect((await request(app).post(url).set('Authorization', owner.authorization).attach('image', png, { filename: 'r.png', contentType: 'image/png' })).status).toBe(503);

    // removing is fine, and the list shows no receipt
    const removed = await request(app).delete(url).set('Authorization', owner.authorization);
    expect(removed.status).toBe(200);
    expect(removed.body.expense.hasReceipt).toBe(false);
    const month = new Date().toISOString().slice(0, 7);
    const list = await request(app).get(`/api/expenses?month=${month}`).set('Authorization', owner.authorization);
    expect(list.body.expenses[0].receipt).toBeNull();
  });
});
