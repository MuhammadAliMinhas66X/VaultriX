import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import Category from '../models/Category.js';
import { isCurrencyCode } from '../utils/validators.js';
import { toMajor, parseAmountMinor, parseDay, parseWhere, optionalText } from '../utils/financeInput.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';

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

    const where = parseWhere(body.payMethod, body.payName);
    if (!where) return fail(res, 400, GENERIC_INVALID);

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
    });

    res.status(201).json({ success: true, expense: toExpenseDto(expense.toObject()) });
  } catch (error) {
    handleError(res, next, error);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!expense) return fail(res, 404, NOT_FOUND);

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

    if (body.payMethod !== undefined) {
      const where = parseWhere(body.payMethod, body.payName);
      if (!where) return fail(res, 400, GENERIC_INVALID);
      update.payMethod = where.method;
      update.payName = where.name;
    }

    Object.assign(expense, update);
    await expense.save();

    res.json({ success: true, expense: toExpenseDto(expense.toObject()) });
  } catch (error) {
    handleError(res, next, error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const result = await Expense.deleteOne({ _id: req.params.id, orgId: req.user.orgId });
    if (result.deletedCount === 0) return fail(res, 404, NOT_FOUND);
    res.json({ success: true });
  } catch (error) {
    handleError(res, next, error);
  }
};
