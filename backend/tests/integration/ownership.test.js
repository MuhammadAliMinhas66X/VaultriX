import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';
import { createAuthedUser } from './helpers.js';
import Loan, { LOAN_DIRECTIONS } from '../../src/models/Loan.js';
import Category, { CATEGORY_TYPE_VALUES } from '../../src/models/Category.js';
import Account from '../../src/models/Account.js';
import Expense from '../../src/models/Expense.js';
import IncomeStream from '../../src/models/IncomeStream.js';
import Bill from '../../src/models/Bill.js';
import IncomeReceipt from '../../src/models/IncomeReceipt.js';
import Organization from '../../src/models/Organization.js';

const { default: app } = await import('../../src/app.js');

const setup = async () => {
  const owner = await createAuthedUser({ email: 'owner@vaultrix.test' });
  const attacker = await createAuthedUser({ email: 'attacker@vaultrix.test' });
  return { owner, attacker };
};

const cases = [
  {
    name: 'loans',
    path: '/api/loans',
    patch: { personName: 'Hacked' },
    make: (owner) =>
      Loan.create({ orgId: owner.user.orgId, createdBy: owner.user._id, direction: LOAN_DIRECTIONS[0], personName: 'Original', amountMinor: 100000, scale: 10000, currency: 'PKR', sentAt: new Date() }),
    exists: async (id) => Boolean(await Loan.exists({ _id: id })),
    changed: async (id) => (await Loan.findById(id)).personName !== 'Original',
  },
  {
    name: 'categories',
    path: '/api/categories',
    patch: { name: 'Hacked' },
    make: (owner) => Category.create({ orgId: owner.user.orgId, createdBy: owner.user._id, name: 'Original', type: CATEGORY_TYPE_VALUES[0] }),
    exists: async (id) => Boolean(await Category.exists({ _id: id })),
    changed: async (id) => (await Category.findById(id)).name !== 'Original',
  },
  {
    name: 'accounts',
    path: '/api/accounts',
    patch: { name: 'Hacked' },
    make: (owner) => Account.create({ orgId: owner.user.orgId, createdBy: owner.user._id, name: 'Original', currency: 'PKR' }),
    exists: async (id) => Boolean(await Account.exists({ _id: id })),
    changed: async (id) => (await Account.findById(id)).name !== 'Original',
  },
  {
    name: 'expenses',
    path: '/api/expenses',
    // The expense list needs a month, otherwise it answers 400.
    listQuery: `?month=${new Date().toISOString().slice(0, 7)}`,
    patch: { note: 'Hacked' },
    make: (owner) => Expense.create({ orgId: owner.user.orgId, createdBy: owner.user._id, amountMinor: 5000, currency: 'PKR', spentAt: new Date(), note: 'Original' }),
    exists: async (id) => Boolean(await Expense.exists({ _id: id })),
    changed: async (id) => (await Expense.findById(id)).note !== 'Original',
  },
  {
    name: 'bills',
    path: '/api/bills',
    patch: { billerName: 'Hacked' },
    make: async (owner) => {
      const bill = new Bill({ orgId: owner.user.orgId, createdBy: owner.user._id, billerName: 'Original', amountMinor: 100000, currency: 'PKR', dueAt: new Date() });
      bill.seriesId = bill._id;
      return bill.save();
    },
    exists: async (id) => Boolean(await Bill.exists({ _id: id })),
    changed: async (id) => (await Bill.findById(id)).billerName !== 'Original',
  },
  {
    name: 'income streams',
    path: '/api/income-streams',
    patch: { name: 'Hacked' },
    make: (owner) => IncomeStream.create({ orgId: owner.user.orgId, createdBy: owner.user._id, name: 'Original', currency: 'PKR' }),
    exists: async (id) => Boolean(await IncomeStream.exists({ _id: id })),
    changed: async (id) => (await IncomeStream.findById(id)).name !== 'Original',
  },
  {
    name: 'income receipts',
    path: '/api/receipts',
    patch: { note: 'Hacked' },
    make: async (owner) => {
      const stream = await IncomeStream.create({ orgId: owner.user.orgId, createdBy: owner.user._id, name: 'Salary', currency: 'PKR' });
      return IncomeReceipt.create({ orgId: owner.user.orgId, streamId: stream._id, createdBy: owner.user._id, receivedAt: new Date(), amountMinor: 100000, currency: 'PKR', note: 'Original' });
    },
    exists: async (id) => Boolean(await IncomeReceipt.exists({ _id: id })),
    changed: async (id) => (await IncomeReceipt.findById(id)).note !== 'Original',
  },
];

describe.each(cases)('another account cannot touch $name', ({ path, listQuery = '', patch, make, changed, exists }) => {
  it('does not list another account\'s records', async () => {
    const { owner, attacker } = await setup();
    const record = await make(owner);
    const res = await request(app).get(`${path}${listQuery}`).set('Authorization', attacker.authorization);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain(String(record._id));
  });

  it('cannot edit another account\'s record', async () => {
    const { owner, attacker } = await setup();
    const record = await make(owner);
    const res = await request(app).patch(`${path}/${record._id}`).set('Authorization', attacker.authorization).send(patch);
    expect(res.status).not.toBe(200);
    expect(await changed(record._id)).toBe(false);
  });

  it('cannot delete another account\'s record', async () => {
    const { owner, attacker } = await setup();
    const record = await make(owner);
    const res = await request(app).delete(`${path}/${record._id}`).set('Authorization', attacker.authorization);
    expect(res.status).not.toBe(200);
    expect(await exists(record._id)).toBe(true);
  });

  it('rejects requests with no sign in', async () => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
  });
});

describe('loan payments', () => {
  it('another account cannot add a payment to someone else\'s loan', async () => {
    const { owner, attacker } = await setup();
    const loan = await Loan.create({ orgId: owner.user.orgId, createdBy: owner.user._id, direction: LOAN_DIRECTIONS[0], personName: 'Original', amountMinor: 100000, scale: 10000, currency: 'PKR', sentAt: new Date() });
    const res = await request(app).post(`/api/loans/${loan._id}/payments`).set('Authorization', attacker.authorization).send({ amount: 1, paidAt: new Date().toISOString() });
    expect(res.status).not.toBe(200);
    expect((await Loan.findById(loan._id)).payments).toHaveLength(0);
  });
});

describe('income receipts and opening balance', () => {
  it('another account cannot add a receipt to someone else\'s stream', async () => {
    const { owner, attacker } = await setup();
    const stream = await IncomeStream.create({ orgId: owner.user.orgId, createdBy: owner.user._id, name: 'Salary', currency: 'PKR' });
    const res = await request(app).post('/api/receipts').set('Authorization', attacker.authorization).send({ streamId: String(stream._id), amount: 100, receivedAt: new Date().toISOString().slice(0, 10) });
    expect(res.status).toBe(404);
    expect(await IncomeReceipt.countDocuments({ streamId: stream._id })).toBe(0);
  });

  it('opening balance only changes the caller\'s own account', async () => {
    const { owner, attacker } = await setup();
    const res = await request(app).put('/api/receipts/opening').set('Authorization', attacker.authorization).send({ amount: 5000, currency: 'PKR', asOf: new Date().toISOString().slice(0, 10) });
    expect(res.status).toBe(200);
    expect((await Organization.findById(owner.user.orgId)).openingBalanceMinor || 0).toBe(0);
    expect((await Organization.findById(attacker.user.orgId)).openingBalanceMinor).toBe(500000);
  });

  it('deleting a stream deletes its receipts', async () => {
    const { owner } = await setup();
    const stream = await IncomeStream.create({ orgId: owner.user.orgId, createdBy: owner.user._id, name: 'Salary', currency: 'PKR' });
    await IncomeReceipt.create({ orgId: owner.user.orgId, streamId: stream._id, receivedAt: new Date(), amountMinor: 100000, currency: 'PKR' });
    const res = await request(app).delete(`/api/income-streams/${stream._id}`).set('Authorization', owner.authorization);
    expect(res.status).toBe(200);
    expect(await IncomeReceipt.countDocuments({ streamId: stream._id })).toBe(0);
  });
});
