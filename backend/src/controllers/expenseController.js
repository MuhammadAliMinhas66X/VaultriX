import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import Category from '../models/Category.js';
import Loan from '../models/Loan.js';
import { isCurrencyCode, cleanLabel } from '../utils/validators.js';
import { isImageStorageReady } from '../config/cloudinary.js';
import { destroyImage } from '../services/imageStorage.js';
import { toMajor, parseAmountMinor, parseDay, parseWhere, optionalText } from '../utils/financeInput.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';
const LINKED_EDIT = 'This expense is linked to a loan that already has payments, so its amount, currency, date and payer cannot be changed.';
const BILL_LINKED = 'This expense comes from a bill payment. Change it from Bills.';
const LINKED_DELETE = 'This expense is linked to a loan that already has payments. Delete those payments first.';

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const toExpenseDto = (expense) => ({
  id: String(expense._id),
  amount: toMajor(expense.amountMinor),
  currency: expense.currency,
  categoryId: expense.categoryId ? String(expense.categoryId) : null,
  spentAt: expense.spentAt,
  note: expense.note || '',
  payMethod: expense.payMethod || '',
  payName: expense.payName || '',
  paidBy: expense.paidBy || 'self',
  payerName: expense.payerName || '',
  loanId: expense.loanId ? String(expense.loanId) : null,
  billId: expense.billId ? String(expense.billId) : null,
  createdAt: expense.createdAt,
});

const handleError = (res, next, error) => {
  if (error?.name === 'CastError') return fail(res, 404, NOT_FOUND);
  return next(error);
};

const parseMonth = (raw) => {
  const match = /^(\d{4})-(\d{2})$/.exec(typeof raw === 'string' ? raw : '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
};

const resolveCategory = async (orgId, raw) => {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  if (!mongoose.isValidObjectId(raw)) return false;
  const found = await Category.findOne({ _id: raw, orgId, type: 'expense' }).lean();
  return found ? found._id : false;
};

const parsePayer = (body, current) => {
  const paidBy = body.paidBy === undefined ? current.paidBy : body.paidBy;
  if (paidBy !== 'self' && paidBy !== 'other') return undefined;
  if (paidBy === 'self') return { paidBy, payerName: '' };
  const name = cleanLabel(body.payerName === undefined ? current.payerName : body.payerName);
  if (!name) return undefined;
  return { paidBy, payerName: name };
};

const paidMinorOf = (loan) => (loan.payments || []).reduce((sum, item) => sum + item.amountMinor, 0);

const toLoanMinor = (loan, expenseMinor) => expenseMinor * ((loan.scale || 100) / 100);

const removeLoan = async (loan) => {
  if (loan.receivedProof?.publicId && isImageStorageReady()) await destroyImage(loan.receivedProof.publicId);
  await Loan.deleteOne({ _id: loan._id });
};

export const listExpenses = async (req, res, next) => {
  try {
    const range = parseMonth(req.query.month);
    if (!range) return fail(res, 400, GENERIC_INVALID);

    const expenses = await Expense.find({ orgId: req.user.orgId, spentAt: { $gte: range.start, $lt: range.end } })
      .sort({ spentAt: -1, createdAt: -1 })
      .limit(2000)
      .lean();

    res.json({ success: true, expenses: expenses.map(toExpenseDto) });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  let createdLoan = null;
  try {
    const body = req.body || {};

    const amountMinor = parseAmountMinor(body.amount);
    if (amountMinor === undefined) return fail(res, 400, GENERIC_INVALID);

    if (!isCurrencyCode(body.currency)) return fail(res, 400, GENERIC_INVALID);

    const spentAt = parseDay(body.spentAt);
    if (!spentAt) return fail(res, 400, GENERIC_INVALID);

    const categoryId = await resolveCategory(req.user.orgId, body.categoryId);
    if (categoryId === false) return fail(res, 400, GENERIC_INVALID);

    const note = optionalText(body.note, 200);
    if (note === undefined) return fail(res, 400, GENERIC_INVALID);

    const payer = parsePayer(body, { paidBy: 'self', payerName: '' });
    if (!payer) return fail(res, 400, GENERIC_INVALID);

    const where = payer.paidBy === 'self' ? parseWhere(body.payMethod, body.payName) : { method: '', name: '' };
    if (!where) return fail(res, 400, GENERIC_INVALID);

    if (payer.paidBy === 'other') {
      createdLoan = await Loan.create({
        orgId: req.user.orgId,
        createdBy: req.user.id,
        direction: 'borrowed',
        personName: payer.payerName,
        amountMinor,
        currency: body.currency,
        sentAt: spentAt,
        note,
        source: 'expense',
      });
    }

    const expense = await Expense.create({
      orgId: req.user.orgId,
      createdBy: req.user.id,
      amountMinor,
      currency: body.currency,
      categoryId: categoryId ?? null,
      spentAt,
      note,
      payMethod: where.method,
      payName: where.name,
      paidBy: payer.paidBy,
      payerName: payer.payerName,
      loanId: createdLoan ? createdLoan._id : null,
    });

    res.status(201).json({ success: true, expense: toExpenseDto(expense.toObject()) });
  } catch (error) {
    if (createdLoan) await Loan.deleteOne({ _id: createdLoan._id }).catch(() => null);
    handleError(res, next, error);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!expense) return fail(res, 404, NOT_FOUND);
    if (expense.billId) return fail(res, 400, BILL_LINKED);

    const body = req.body || {};
    const update = {};

    if (body.amount !== undefined) {
      const amountMinor = parseAmountMinor(body.amount);
      if (amountMinor === undefined) return fail(res, 400, GENERIC_INVALID);
      update.amountMinor = amountMinor;
    }

    if (body.currency !== undefined) {
      if (!isCurrencyCode(body.currency)) return fail(res, 400, GENERIC_INVALID);
      update.currency = body.currency;
    }

    if (body.spentAt !== undefined) {
      const spentAt = parseDay(body.spentAt);
      if (!spentAt) return fail(res, 400, GENERIC_INVALID);
      update.spentAt = spentAt;
    }

    if (body.categoryId !== undefined) {
      const categoryId = await resolveCategory(req.user.orgId, body.categoryId);
      if (categoryId === false) return fail(res, 400, GENERIC_INVALID);
      update.categoryId = categoryId;
    }

    if (body.note !== undefined) {
      const note = optionalText(body.note, 200);
      if (note === undefined) return fail(res, 400, GENERIC_INVALID);
      update.note = note;
    }

    const payer = parsePayer(body, { paidBy: expense.paidBy, payerName: expense.payerName });
    if (!payer) return fail(res, 400, GENERIC_INVALID);

    if (payer.paidBy === 'self' && body.payMethod !== undefined) {
      const where = parseWhere(body.payMethod, body.payName);
      if (!where) return fail(res, 400, GENERIC_INVALID);
      update.payMethod = where.method;
      update.payName = where.name;
    }
    if (payer.paidBy === 'other') {
      update.payMethod = '';
      update.payName = '';
    }

    const next_ = {
      amountMinor: update.amountMinor ?? expense.amountMinor,
      currency: update.currency ?? expense.currency,
      spentAt: update.spentAt ?? expense.spentAt,
      note: update.note ?? expense.note,
    };

    let loan = expense.loanId ? await Loan.findOne({ _id: expense.loanId, orgId: req.user.orgId }) : null;
    let loanId = loan ? loan._id : null;

    if (payer.paidBy === 'self') {
      if (loan) {
        if (loan.payments.length > 0) return fail(res, 400, LINKED_EDIT);
        await removeLoan(loan);
      }
      loanId = null;
    } else if (loan) {
      const paid = paidMinorOf(loan);
      const nextMinor = toLoanMinor(loan, next_.amountMinor);
      const firstPayment = loan.payments.reduce((min, item) => (!min || item.paidAt < min ? item.paidAt : min), null);
      const sensitive =
        nextMinor !== loan.amountMinor || next_.currency !== loan.currency || String(next_.spentAt) !== String(loan.sentAt);
      if (loan.payments.length > 0 && sensitive) {
        if (nextMinor < paid || next_.currency !== loan.currency || (firstPayment && next_.spentAt > firstPayment)) {
          return fail(res, 400, LINKED_EDIT);
        }
      }
      loan.personName = payer.payerName;
      loan.amountMinor = nextMinor;
      loan.currency = next_.currency;
      loan.sentAt = next_.spentAt;
      loan.note = next_.note;
      await loan.save();
    } else {
      const created = await Loan.create({
        orgId: req.user.orgId,
        createdBy: req.user.id,
        direction: 'borrowed',
        personName: payer.payerName,
        amountMinor: next_.amountMinor,
        currency: next_.currency,
        sentAt: next_.spentAt,
        note: next_.note,
        source: 'expense',
      });
      loanId = created._id;
    }

    Object.assign(expense, update, { paidBy: payer.paidBy, payerName: payer.payerName, loanId });
    await expense.save();

    res.json({ success: true, expense: toExpenseDto(expense.toObject()) });
  } catch (error) {
    handleError(res, next, error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!expense) return fail(res, 404, NOT_FOUND);
    if (expense.billId) return fail(res, 400, BILL_LINKED);

    if (expense.loanId) {
      const loan = await Loan.findOne({ _id: expense.loanId, orgId: req.user.orgId });
      if (loan) {
        if (loan.payments.length > 0) return fail(res, 400, LINKED_DELETE);
        await removeLoan(loan);
      }
    }

    await Expense.deleteOne({ _id: expense._id });
    res.json({ success: true });
  } catch (error) {
    handleError(res, next, error);
  }
};
