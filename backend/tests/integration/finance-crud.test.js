import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './dbSetup.js';
import './mailerMock.js';
import { createAuthedUser } from './helpers.js';
import Bill from '../../src/models/Bill.js';
import Expense from '../../src/models/Expense.js';
import Loan from '../../src/models/Loan.js';
import IncomeReceipt from '../../src/models/IncomeReceipt.js';
import IncomeStream from '../../src/models/IncomeStream.js';

const { default: app } = await import('../../src/app.js');

// Money flows end to end through the real HTTP layer: income, receipts, opening
// balance, expenses, expense totals, bills (create, pay, overpay, double tap,
// recurring generation), loan payments and read-only roles.

const iso = (offsetDays = 0) => new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const as = (user) => ({
  get: (path) => request(app).get(path).set('Authorization', user.authorization),
  post: (path, body) => request(app).post(path).set('Authorization', user.authorization).send(body),
  patch: (path, body) => request(app).patch(path).set('Authorization', user.authorization).send(body),
  put: (path, body) => request(app).put(path).set('Authorization', user.authorization).send(body),
  del: (path) => request(app).delete(path).set('Authorization', user.authorization),
});

const newUser = async (overrides) => {
  const user = await createAuthedUser({ email: 'money@vaultrix.test', ...overrides });
  return { user, api: as(user) };
};

describe('income streams and receipts', () => {
  it('a stream saved with an amount records its first receipt', async () => {
    const { api } = await newUser();
    const created = await api.post('/api/income-streams', { name: 'Salary', currency: 'PKR', expectedAmount: 100000, destinationMethod: 'cash', receivedAt: iso(-3) });
    expect(created.status).toBe(201);
    const list = await api.get('/api/receipts');
    expect(list.status).toBe(200);
    expect(list.body.receipts).toHaveLength(1);
    expect(list.body.receipts[0]).toMatchObject({ amount: 100000, currency: 'PKR', source: 'stream' });
  });

  it('a stream saved without an amount makes no receipt', async () => {
    const { api } = await newUser();
    const created = await api.post('/api/income-streams', { name: 'Freelance', currency: 'PKR', destinationMethod: 'cash' });
    expect(created.status).toBe(201);
    const list = await api.get('/api/receipts');
    expect(list.body.receipts).toHaveLength(0);
  });

  it('rejects a stream with a bad name or currency', async () => {
    const { api } = await newUser();
    expect((await api.post('/api/income-streams', { name: '', currency: 'PKR', destinationMethod: 'cash' })).status).toBe(400);
    expect((await api.post('/api/income-streams', { name: 'Salary', currency: 'ZZZ', destinationMethod: 'cash' })).status).toBe(400);
  });

  it('adds, edits and deletes a receipt, and refuses bad input', async () => {
    const { api } = await newUser();
    const stream = (await api.post('/api/income-streams', { name: 'Salary', currency: 'PKR', destinationMethod: 'cash' })).body.incomeStream;

    const added = await api.post('/api/receipts', { streamId: stream.id, amount: 500, receivedAt: iso(-1), note: 'November' });
    expect(added.status).toBe(201);
    expect(added.body.receipt).toMatchObject({ amount: 500, currency: 'PKR', note: 'November' });

    const edited = await api.patch(`/api/receipts/${added.body.receipt.id}`, { amount: 750 });
    expect(edited.status).toBe(200);
    expect(edited.body.receipt.amount).toBe(750);

    expect((await api.post('/api/receipts', { streamId: stream.id, amount: 0, receivedAt: iso() })).status).toBe(400);
    expect((await api.post('/api/receipts', { streamId: stream.id, amount: -5, receivedAt: iso() })).status).toBe(400);
    expect((await api.post('/api/receipts', { streamId: stream.id, amount: 10, receivedAt: iso(10) })).status).toBe(400);
    expect((await api.post('/api/receipts', { streamId: 'not-an-id', amount: 10, receivedAt: iso() })).status).toBe(400);

    expect((await api.del(`/api/receipts/${added.body.receipt.id}`)).status).toBe(200);
    expect((await api.get('/api/receipts')).body.receipts).toHaveLength(0);
  });

  it('turns old streams into receipts once', async () => {
    const { user, api } = await newUser();
    await IncomeStream.create({ orgId: user.user.orgId, createdBy: user.user._id, name: 'Old salary', currency: 'PKR', expectedAmountMinor: 5000000, receivedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) });
    const first = await api.get('/api/receipts');
    expect(first.body.receipts).toHaveLength(1);
    expect(first.body.receipts[0]).toMatchObject({ amount: 50000, source: 'backfill' });
    const second = await api.get('/api/receipts');
    expect(second.body.receipts).toHaveLength(1);
    expect(await IncomeReceipt.countDocuments({ orgId: user.user.orgId })).toBe(1);
  });

  it('deleting a stream deletes its receipts', async () => {
    const { user, api } = await newUser();
    const stream = (await api.post('/api/income-streams', { name: 'Salary', currency: 'PKR', expectedAmount: 1000, destinationMethod: 'cash' })).body.incomeStream;
    expect(await IncomeReceipt.countDocuments({ orgId: user.user.orgId })).toBe(1);
    expect((await api.del(`/api/income-streams/${stream.id}`)).status).toBe(200);
    expect(await IncomeReceipt.countDocuments({ orgId: user.user.orgId })).toBe(0);
  });

  it('sets, reads and clears the opening balance', async () => {
    const { api } = await newUser();
    const set = await api.put('/api/receipts/opening', { amount: 5000, currency: 'PKR', asOf: iso(-30) });
    expect(set.status).toBe(200);
    expect(set.body.opening).toMatchObject({ amount: 5000, currency: 'PKR', asOf: iso(-30) });
    expect((await api.get('/api/receipts/opening')).body.opening.amount).toBe(5000);

    expect((await api.put('/api/receipts/opening', { amount: 5000, currency: 'ZZZ', asOf: iso(-30) })).status).toBe(400);
    expect((await api.put('/api/receipts/opening', { amount: 5000, currency: 'PKR' })).status).toBe(400);

    const cleared = await api.put('/api/receipts/opening', { amount: 0 });
    expect(cleared.body.opening).toMatchObject({ amount: 0, currency: '', asOf: null });
  });
});

describe('expenses and expense totals', () => {
  it('creates, lists, edits and deletes an expense', async () => {
    const { api } = await newUser();
    const created = await api.post('/api/expenses', { amount: 250.5, currency: 'PKR', spentAt: iso(), payMethod: 'cash', note: 'Groceries' });
    expect(created.status).toBe(201);

    const month = iso().slice(0, 7);
    expect((await api.get(`/api/expenses?month=${month}`)).body.expenses).toHaveLength(1);

    expect((await api.patch(`/api/expenses/${created.body.expense.id}`, { amount: 300 })).status).toBe(200);
    const after = (await api.get(`/api/expenses?month=${month}`)).body.expenses[0];
    expect(after.amount).toBe(300);

    expect((await api.del(`/api/expenses/${created.body.expense.id}`)).status).toBe(200);
    expect((await api.get(`/api/expenses?month=${month}`)).body.expenses).toHaveLength(0);
  });

  it('refuses a bad amount, currency or a future date', async () => {
    const { api } = await newUser();
    expect((await api.post('/api/expenses', { amount: 0, currency: 'PKR', spentAt: iso() })).status).toBe(400);
    expect((await api.post('/api/expenses', { amount: 10, currency: 'ZZZ', spentAt: iso() })).status).toBe(400);
    expect((await api.post('/api/expenses', { amount: 10, currency: 'PKR', spentAt: iso(10) })).status).toBe(400);
  });

  it('totals split what I paid, what others paid, and what I paid back', async () => {
    const { user, api } = await newUser();
    await api.post('/api/expenses', { amount: 100, currency: 'PKR', spentAt: iso(), payMethod: 'cash' });
    await api.post('/api/expenses', { amount: 40, currency: 'PKR', spentAt: iso(), paidBy: 'other', payerName: 'Sara' });

    const before = await api.get('/api/expenses/totals');
    expect(before.status).toBe(200);
    expect(before.body.totals).toEqual([{ month: iso().slice(0, 7), currency: 'PKR', self: 100, other: 40, repaid: 0 }]);

    const loan = await Loan.findOne({ orgId: user.user.orgId });
    expect(loan).toBeTruthy();
    expect((await api.post(`/api/loans/${loan._id}/payments`, { amount: 20, paidAt: iso() })).status).toBe(201);

    const after = await api.get('/api/expenses/totals');
    expect(after.body.totals[0]).toMatchObject({ self: 100, other: 40, repaid: 20 });
  });

  it('totals honour the since date', async () => {
    const { api } = await newUser();
    await api.post('/api/expenses', { amount: 100, currency: 'PKR', spentAt: iso(-40), payMethod: 'cash' });
    await api.post('/api/expenses', { amount: 30, currency: 'PKR', spentAt: iso(), payMethod: 'cash' });
    const all = (await api.get('/api/expenses/totals')).body.totals.reduce((sum, row) => sum + row.self, 0);
    const recent = (await api.get(`/api/expenses/totals?since=${iso(-10)}`)).body.totals.reduce((sum, row) => sum + row.self, 0);
    expect(all).toBe(130);
    expect(recent).toBe(30);
    expect((await api.get('/api/expenses/totals?since=nonsense')).status).toBe(400);
  });
});

describe('bills', () => {
  const makeBill = (api, extra = {}) => api.post('/api/bills', { billerName: 'Electricity', amount: 1000, currency: 'PKR', dueAt: iso(10), ...extra });

  it('pays a bill in steps, makes one expense per payment, and refuses overpaying', async () => {
    const { user, api } = await newUser();
    const bill = (await makeBill(api)).body.bill;
    expect(bill).toMatchObject({ total: 1000, paid: 0, remaining: 1000 });

    const first = await api.post(`/api/bills/${bill.id}/payments`, { amount: 400, paidAt: iso(), payMethod: 'cash' });
    expect(first.status).toBe(201);
    expect(first.body.bill).toMatchObject({ paid: 400, remaining: 600 });
    expect(await Expense.countDocuments({ orgId: user.user.orgId, billId: bill.id })).toBe(1);

    const over = await api.post(`/api/bills/${bill.id}/payments`, { amount: 700, paidAt: iso(), payMethod: 'cash' });
    expect(over.status).toBe(400);
    expect(await Expense.countDocuments({ orgId: user.user.orgId, billId: bill.id })).toBe(1);

    const rest = await api.post(`/api/bills/${bill.id}/payments`, { amount: 600, paidAt: iso(), payMethod: 'cash' });
    expect(rest.status).toBe(201);
    expect(rest.body.bill.remaining).toBe(0);
    expect((await api.post(`/api/bills/${bill.id}/payments`, { amount: 1, paidAt: iso(), payMethod: 'cash' })).status).toBe(400);
  });

  it('refuses a future payment date', async () => {
    const { api } = await newUser();
    const bill = (await makeBill(api)).body.bill;
    expect((await api.post(`/api/bills/${bill.id}/payments`, { amount: 100, paidAt: iso(5), payMethod: 'cash' })).status).toBe(400);
  });

  it('deleting a payment removes its expense, and that expense cannot be deleted by hand', async () => {
    const { user, api } = await newUser();
    const bill = (await makeBill(api)).body.bill;
    const paid = await api.post(`/api/bills/${bill.id}/payments`, { amount: 300, paidAt: iso(), payMethod: 'cash' });
    const expense = await Expense.findOne({ orgId: user.user.orgId, billId: bill.id });
    expect((await api.del(`/api/expenses/${expense._id}`)).status).toBe(400);

    expect((await api.del(`/api/bills/${bill.id}/payments/${paid.body.paymentId}`)).status).toBe(200);
    expect(await Expense.countDocuments({ orgId: user.user.orgId, billId: bill.id })).toBe(0);
  });

  it('a double tap pays the bill once', async () => {
    const { user, api } = await newUser();
    const bill = (await makeBill(api)).body.bill;
    const results = await Promise.all([
      api.post(`/api/bills/${bill.id}/payments`, { amount: 1000, paidAt: iso(), payMethod: 'cash' }),
      api.post(`/api/bills/${bill.id}/payments`, { amount: 1000, paidAt: iso(), payMethod: 'cash' }),
    ]);
    const statuses = results.map((result) => result.status).sort();
    expect(statuses[0]).toBe(201);
    expect([400, 409]).toContain(statuses[1]);

    const saved = await Bill.findById(bill.id);
    expect(saved.payments).toHaveLength(1);
    expect(await Expense.countDocuments({ orgId: user.user.orgId, billId: bill.id })).toBe(1);
  });

  it('a double tap on a recurring list makes each bill once', async () => {
    const { api } = await newUser();
    await Bill.init();
    await makeBill(api, { dueAt: iso(-40), frequency: 'monthly', nextBillAt: iso(-1) });

    const lists = await Promise.all([api.get(`/api/bills?today=${iso()}`), api.get(`/api/bills?today=${iso()}`), api.get(`/api/bills?today=${iso()}`)]);
    lists.forEach((list) => expect(list.status).toBe(200));

    const final = (await api.get(`/api/bills?today=${iso()}`)).body.bills;
    expect(final.length).toBeGreaterThanOrEqual(2);
    const keys = final.map((bill) => `${bill.seriesId}|${bill.sequence}`);
    expect(new Set(keys).size).toBe(keys.length);

    const again = (await api.get(`/api/bills?today=${iso()}`)).body.bills;
    expect(again).toHaveLength(final.length);
  });
});

describe('loan payments', () => {
  const makeLoan = (api, extra = {}) => api.post('/api/loans', { direction: 'borrowed', personName: 'Ali', amount: 1000, currency: 'PKR', sentAt: iso(-10), receivedMethod: 'cash', ...extra });

  it('takes payments in steps, refuses overpaying and paying before the loan started', async () => {
    const { api } = await newUser();
    const loan = (await makeLoan(api)).body.loan;
    expect(loan).toMatchObject({ amount: 1000, paid: 0, remaining: 1000, done: false });

    const first = await api.post(`/api/loans/${loan.id}/payments`, { amount: 400, paidAt: iso(-5) });
    expect(first.status).toBe(201);
    expect(first.body.loan).toMatchObject({ paid: 400, remaining: 600 });

    expect((await api.post(`/api/loans/${loan.id}/payments`, { amount: 700, paidAt: iso(-4) })).status).toBe(400);
    expect((await api.post(`/api/loans/${loan.id}/payments`, { amount: 100, paidAt: iso(-20) })).status).toBe(400);

    const rest = await api.post(`/api/loans/${loan.id}/payments`, { amount: 600, paidAt: iso(-3) });
    expect(rest.body.loan).toMatchObject({ remaining: 0, done: true });

    const removed = await api.del(`/api/loans/${loan.id}/payments/${first.body.paymentId}`);
    expect(removed.status).toBe(200);
    expect(removed.body.loan.paid).toBe(600);
  });

  it('a double tap pays the loan once', async () => {
    const { api } = await newUser();
    const loan = (await makeLoan(api)).body.loan;
    const results = await Promise.all([
      api.post(`/api/loans/${loan.id}/payments`, { amount: 1000, paidAt: iso() }),
      api.post(`/api/loans/${loan.id}/payments`, { amount: 1000, paidAt: iso() }),
    ]);
    const statuses = results.map((result) => result.status).sort();
    expect(statuses[0]).toBe(201);
    expect([400, 404, 409]).toContain(statuses[1]);
    expect((await Loan.findById(loan.id)).payments).toHaveLength(1);
  });
});

describe('read-only role', () => {
  it('a viewer can read but cannot write money data', async () => {
    const { api } = await newUser({ role: 'viewer' });
    expect((await api.get('/api/receipts')).status).toBe(200);
    expect((await api.get(`/api/expenses?month=${iso().slice(0, 7)}`)).status).toBe(200);
    expect((await api.post('/api/expenses', { amount: 10, currency: 'PKR', spentAt: iso() })).status).toBe(403);
    expect((await api.post('/api/bills', { billerName: 'Gas', amount: 10, currency: 'PKR', dueAt: iso(5) })).status).toBe(403);
    expect((await api.post('/api/loans', { direction: 'lent', personName: 'Ali', amount: 10, currency: 'PKR', sentAt: iso() })).status).toBe(403);
    expect((await api.put('/api/receipts/opening', { amount: 10, currency: 'PKR', asOf: iso() })).status).toBe(403);
  });
});
