import Expense from '../models/Expense.js';
import Category from '../models/Category.js';
import Bill from '../models/Bill.js';
import Loan from '../models/Loan.js';
import IncomeReceipt from '../models/IncomeReceipt.js';
import IncomeStream from '../models/IncomeStream.js';
import mongoose from 'mongoose';
import { toCsv } from '../utils/csv.js';
import { isCurrencyCode, cleanLabel } from '../utils/validators.js';
import { toMajor, parseAmountMinor, parseDay, optionalText } from '../utils/financeInput.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const MAX_ROWS = 50000;
const MAX_IMPORT_ROWS = 100;
const day = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const sum = (list) => (list || []).reduce((total, item) => total + item.amountMinor, 0);
const fail = (res, status, message) => res.status(status).json({ success: false, message });

const builders = {
  expenses: async (orgId) => {
    const [expenses, categories] = await Promise.all([
      Expense.find({ orgId }).sort({ spentAt: -1, createdAt: -1 }).limit(MAX_ROWS).lean(),
      Category.find({ orgId }).select('name').lean(),
    ]);
    const names = new Map(categories.map((category) => [String(category._id), category.name]));
    return toCsv(
      [
        { label: 'Date', value: (row) => day(row.spentAt) },
        { label: 'Amount', value: (row) => toMajor(row.amountMinor) },
        { label: 'Currency', value: (row) => row.currency },
        { label: 'Category', value: (row) => (row.categoryId ? names.get(String(row.categoryId)) || '' : '') },
        { label: 'Note', value: (row) => row.note },
        { label: 'Paid by', value: (row) => (row.paidBy === 'other' ? row.payerName || 'Someone else' : 'Me') },
        { label: 'Given to', value: (row) => row.givenTo },
        { label: 'Payment method', value: (row) => row.payMethod },
        { label: 'Account', value: (row) => row.payName },
        { label: 'From a bill', value: (row) => (row.billId ? 'Yes' : '') },
      ],
      expenses
    );
  },
  income: async (orgId) => {
    const [receipts, streams] = await Promise.all([
      IncomeReceipt.find({ orgId }).sort({ receivedAt: -1, createdAt: -1 }).limit(MAX_ROWS).lean(),
      IncomeStream.find({ orgId }).select('name').lean(),
    ]);
    const names = new Map(streams.map((stream) => [String(stream._id), stream.name]));
    return toCsv(
      [
        { label: 'Date', value: (row) => day(row.receivedAt) },
        { label: 'Income stream', value: (row) => names.get(String(row.streamId)) || '' },
        { label: 'Amount (before deductions)', value: (row) => toMajor(row.amountMinor) },
        { label: 'Currency', value: (row) => row.currency },
        { label: 'Note', value: (row) => row.note },
      ],
      receipts
    );
  },
  bills: async (orgId) => {
    const bills = await Bill.find({ orgId }).sort({ dueAt: -1 }).limit(MAX_ROWS).lean();
    return toCsv(
      [
        { label: 'Biller', value: (row) => row.billerName },
        { label: 'Due date', value: (row) => day(row.dueAt) },
        { label: 'Total', value: (row) => toMajor(row.amountMinor + (row.installationMinor || 0)) },
        { label: 'Paid', value: (row) => toMajor(sum(row.payments)) },
        { label: 'Remaining', value: (row) => toMajor(Math.max(0, row.amountMinor + (row.installationMinor || 0) - sum(row.payments))) },
        { label: 'Currency', value: (row) => row.currency },
        { label: 'Repeats', value: (row) => (row.frequency === 'none' ? '' : row.frequency) },
        { label: 'Cancelled', value: (row) => (row.cancelledAt ? 'Yes' : '') },
        { label: 'Note', value: (row) => row.note },
      ],
      bills
    );
  },
  loans: async (orgId) => {
    const loans = await Loan.find({ orgId }).sort({ sentAt: -1 }).limit(MAX_ROWS).lean();
    return toCsv(
      [
        { label: 'Type', value: (row) => (row.direction === 'borrowed' ? 'I borrowed' : 'I lent') },
        { label: 'Person', value: (row) => row.personName },
        { label: 'Amount', value: (row) => toMajor(row.amountMinor) },
        { label: 'Paid back', value: (row) => toMajor(sum(row.payments)) },
        { label: 'Remaining', value: (row) => toMajor(Math.max(0, row.amountMinor - sum(row.payments))) },
        { label: 'Currency', value: (row) => row.currency },
        { label: 'Date', value: (row) => day(row.sentAt) },
        { label: 'Due date', value: (row) => day(row.dueAt) },
        { label: 'Note', value: (row) => row.note },
      ],
      loans
    );
  },
};

export const exportCsv = async (req, res, next) => {
  try {
    const build = Object.prototype.hasOwnProperty.call(builders, req.params.kind) ? builders[req.params.kind] : null;
    if (!build) return fail(res, 404, 'That action could not be completed.');
    const csv = await build(req.user.orgId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="vaultrix-${req.params.kind}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// Rows: [{ row, date, amount, currency, category, note }] (row = line number in the file, for the report).
// Invalid rows and rows already saved (same date, amount, currency and note) are skipped, never fatal.
export const importExpenses = async (req, res, next) => {
  try {
    const rows = req.body && req.body.rows;
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_IMPORT_ROWS) return fail(res, 400, GENERIC_INVALID);

    const orgId = req.user.orgId;
    const categories = await Category.find({ orgId, type: 'expense', isArchived: { $ne: true } }).select('name').lean();
    const byName = new Map(categories.map((category) => [category.name.trim().toLowerCase(), category._id]));

    const skipped = [];
    const good = [];
    rows.forEach((raw, index) => {
      const row = raw && typeof raw === 'object' ? raw : {};
      const line = Number.isInteger(row.row) ? row.row : index + 1;
      const spentAt = parseDay(typeof row.date === 'string' ? row.date : '');
      const amountMinor = parseAmountMinor(row.amount);
      const note = optionalText(row.note, 200);
      if (!spentAt || amountMinor === undefined || !isCurrencyCode(row.currency) || note === undefined) {
        skipped.push({ row: line, reason: 'invalid' });
        return;
      }
      const categoryId = typeof row.category === 'string' ? byName.get(row.category.trim().toLowerCase()) || null : null;
      good.push({ line, spentAt, amountMinor, currency: row.currency, note: note || '', categoryId });
    });

    if (good.length > 0) {
      const dates = good.map((item) => item.spentAt.getTime());
      const existing = await Expense.find({ orgId, spentAt: { $gte: new Date(Math.min(...dates)), $lte: new Date(Math.max(...dates)) } })
        .select('spentAt amountMinor currency note')
        .lean();
      const key = (item) => `${new Date(item.spentAt).toISOString().slice(0, 10)}|${item.amountMinor}|${item.currency}|${(item.note || '').trim()}`;
      const seen = new Set(existing.map(key));
      const fresh = [];
      good.forEach((item) => {
        const k = key(item);
        if (seen.has(k)) skipped.push({ row: item.line, reason: 'duplicate' });
        else {
          seen.add(k);
          fresh.push(item);
        }
      });
      if (fresh.length > 0) {
        await Expense.insertMany(
          fresh.map((item) => ({
            orgId,
            createdBy: req.user.id,
            amountMinor: item.amountMinor,
            currency: item.currency,
            categoryId: item.categoryId,
            spentAt: item.spentAt,
            note: item.note,
          }))
        );
      }
      return res.status(201).json({ success: true, created: fresh.length, skipped });
    }
    res.status(200).json({ success: true, created: 0, skipped });
  } catch (error) {
    next(error);
  }
};

const IMPORT_KINDS = ['expense', 'income', 'bill', 'loan', 'loanPayment'];
const dayKey = (date) => new Date(date).toISOString().slice(0, 10);
const IMPORT_STREAM = 'Imported income';

// Smart import: every row says what it is (expense, income, bill, loan, loan
// payment) and the date it belongs on. Each kind goes to its own module, with
// the row's date as that module's date. Rows that already exist are skipped.
export const importMixed = async (req, res, next) => {
  try {
    const rows = req.body && req.body.rows;
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_IMPORT_ROWS) return fail(res, 400, GENERIC_INVALID);

    const orgId = req.user.orgId;
    const createdBy = req.user.id;
    const created = { expense: 0, income: 0, bill: 0, loan: 0, loanPayment: 0 };
    const skipped = [];

    const categories = await Category.find({ orgId, type: 'expense', isArchived: { $ne: true } }).select('name').lean();
    const byName = new Map(categories.map((category) => [category.name.trim().toLowerCase(), category._id]));
    let stream = null;
    const getStream = async (currency) => {
      if (stream) return stream;
      stream = await IncomeStream.findOne({ orgId, name: IMPORT_STREAM, isArchived: { $ne: true } });
      if (!stream) {
        stream = await IncomeStream.create({
          orgId,
          createdBy,
          name: IMPORT_STREAM,
          incomeType: 'other',
          typeDetail: 'Added from a file you imported',
          frequency: 'variable',
          destinationMethod: 'bank',
          currency,
        });
      }
      return stream;
    };

    for (let index = 0; index < rows.length; index += 1) {
      const raw = rows[index] && typeof rows[index] === 'object' ? rows[index] : {};
      const line = Number.isInteger(raw.row) ? raw.row : index + 1;
      const bad = (reason = 'invalid') => skipped.push({ row: line, reason });
      const kind = raw.kind;
      if (!IMPORT_KINDS.includes(kind)) {
        bad();
        continue;
      }
      const date = parseDay(typeof raw.date === 'string' ? raw.date : '', { maxFutureDays: kind === 'bill' ? 3650 : 1 });
      const amountMinor = parseAmountMinor(raw.amount);
      const note = optionalText(raw.note, 200);
      if (!date || amountMinor === undefined || !isCurrencyCode(raw.currency) || note === undefined) {
        bad();
        continue;
      }
      const currency = raw.currency;
      const text = note || '';

      if (kind === 'expense') {
        const exists = await Expense.exists({ orgId, spentAt: date, amountMinor, currency, note: text });
        if (exists) {
          bad('duplicate');
          continue;
        }
        const categoryId = typeof raw.category === 'string' ? byName.get(raw.category.trim().toLowerCase()) || null : null;
        await Expense.create({ orgId, createdBy, amountMinor, currency, categoryId, spentAt: date, note: text });
        created.expense += 1;
      } else if (kind === 'income') {
        const exists = await IncomeReceipt.exists({ orgId, receivedAt: date, amountMinor, currency, note: text });
        if (exists) {
          bad('duplicate');
          continue;
        }
        const target = await getStream(currency);
        await IncomeReceipt.create({ orgId, createdBy, streamId: target._id, receivedAt: date, amountMinor, currency, note: text, source: 'manual' });
        created.income += 1;
      } else if (kind === 'bill') {
        const billerName = cleanLabel(typeof raw.billerName === 'string' ? raw.billerName : '') || cleanLabel(text.slice(0, 60)) || 'Bill';
        const exists = await Bill.exists({ orgId, billerName, dueAt: date, amountMinor, currency });
        if (exists) {
          bad('duplicate');
          continue;
        }
        const billerId = typeof raw.billerId === 'string' ? raw.billerId.slice(0, 40) : '';
        const _id = new mongoose.Types.ObjectId();
        const paymentId = new mongoose.Types.ObjectId();
        const paid = raw.paid !== false && date.getTime() <= Date.now() + 24 * 60 * 60 * 1000;
        let expense = null;
        try {
          if (paid) {
            expense = await Expense.create({
              orgId,
              createdBy,
              amountMinor,
              currency,
              categoryId: null,
              spentAt: date,
              note: (text ? `${billerName} - ${text}` : billerName).slice(0, 200),
              billId: _id,
              billPaymentId: paymentId,
            });
          }
          await Bill.create({
            _id,
            orgId,
            createdBy,
            billerName,
            billerId,
            amountMinor,
            currency,
            dueAt: date,
            note: text,
            frequency: 'none',
            seriesId: _id,
            sequence: 1,
            nextSeq: 2,
            payments: paid ? [{ _id: paymentId, amountMinor, paidAt: date, payMethod: '', payName: '', note: '', expenseId: expense._id }] : [],
          });
          created.bill += 1;
        } catch (error) {
          if (expense) await Expense.deleteOne({ _id: expense._id }).catch(() => null);
          throw error;
        }
      } else {
        const direction = raw.direction === 'lent' ? 'lent' : raw.direction === 'borrowed' ? 'borrowed' : null;
        const personName = cleanLabel(typeof raw.person === 'string' ? raw.person : '') || 'Unknown';
        if (!direction) {
          bad();
          continue;
        }
        if (kind === 'loan') {
          const exists = await Loan.exists({ orgId, personName, direction, amountMinor, sentAt: date });
          if (exists) {
            bad('duplicate');
            continue;
          }
          await Loan.create({ orgId, createdBy, direction, personName, amountMinor, scale: 100, currency, sentAt: date, note: text, source: 'manual' });
          created.loan += 1;
        } else {
          // Repayment: goes on the oldest open loan with this person that was
          // already given/taken on or before this date and still has room.
          const loans = await Loan.find({ orgId, personName, direction, currency, sentAt: { $lte: date } }).sort({ sentAt: 1, createdAt: 1 });
          const target = loans.find((loan) => loan.amountMinor - sum(loan.payments) >= amountMinor);
          if (!target) {
            bad(loans.length === 0 ? 'noLoan' : 'tooMuch');
            continue;
          }
          const same = target.payments.some((payment) => payment.amountMinor === amountMinor && dayKey(payment.paidAt) === dayKey(date));
          if (same) {
            bad('duplicate');
            continue;
          }
          target.payments.push({ amountMinor, paidAt: date, note: text });
          await target.save();
          created.loanPayment += 1;
        }
      }
    }

    const total = Object.values(created).reduce((a, b) => a + b, 0);
    res.status(total > 0 ? 201 : 200).json({ success: true, created, skipped });
  } catch (error) {
    next(error);
  }
};
