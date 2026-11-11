import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import Category from '../models/Category.js';
import Loan from '../models/Loan.js';
import { isCurrencyCode, cleanLabel } from '../utils/validators.js';
import {
  paidMinorOf,
  firstPaymentOf,
  relationOf,
  personOf,
  directionOf,
  sameName,
  attachExpense,
  checkDetach,
  commitDetach,
  summarizeLoans,
} from '../utils/expenseLoanLink.js';
import { toMajor, parseAmountMinor, parseDay, parseWhere, optionalText } from '../utils/financeInput.js';
import { repaidMinorOf, buildTotals } from '../utils/balanceTotals.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';
const BILL_LINKED = 'This expense comes from a bill payment. Change it from Bills.';
const LINKED_EDIT = 'This expense is linked to a loan that already has payments, so its amount, currency, date and payer cannot be changed.';
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
  givenTo: expense.givenTo || '',
  billId: expense.billId ? String(expense.billId) : null,
  loanId: expense.loanId ? String(expense.loanId) : null,
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

  if (paidBy === 'other') {
    if (typeof body.givenTo === 'string' && body.givenTo.trim()) return undefined;
    const name = cleanLabel(body.payerName === undefined ? current.payerName : body.payerName);
    if (!name) return undefined;
    return { paidBy, payerName: name, givenTo: '' };
  }

  const rawGiven = body.givenTo === undefined ? current.givenTo : body.givenTo;
  if (rawGiven === undefined || rawGiven === null || String(rawGiven).trim() === '') return { paidBy, payerName: '', givenTo: '' };
  const given = cleanLabel(rawGiven);
  if (!given) return undefined;
  return { paidBy, payerName: '', givenTo: given };
};

const withLoans = async (orgId, expenses) => {
  const summaries = await summarizeLoans(orgId, expenses.map((expense) => expense.loanId));
  return expenses.map((expense) => ({ ...toExpenseDto(expense), loan: expense.loanId ? summaries.get(String(expense.loanId)) || null : null }));
};

export const listExpenses = async (req, res, next) => {
  try {
    const range = parseMonth(req.query.month);
    if (!range) return fail(res, 400, GENERIC_INVALID);

    const expenses = await Expense.find({ orgId: req.user.orgId, spentAt: { $gte: range.start, $lt: range.end } })
      .sort({ spentAt: -1, createdAt: -1 })
      .limit(2000)
      .lean();

    res.json({ success: true, expenses: await withLoans(req.user.orgId, expenses), capped: expenses.length >= 2000 });
  } catch (error) {
    next(error);
  }
};

// Money spent per month and currency, for the running balance. Rows carry what I
// paid myself, what others paid first, and how much of that I have paid back.
// `since` (YYYY-MM-DD) is the opening-balance date; omit it to count everything.
export const expenseTotals = async (req, res, next) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.user.orgId));
    const match = { orgId };
    if (req.query.since !== undefined && req.query.since !== '') {
      const since = parseDay(String(req.query.since), { maxFutureDays: 3650 });
      if (!since) return fail(res, 400, GENERIC_INVALID);
      match.spentAt = { $gte: since };
    }

    const groups = await Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$spentAt' } },
            currency: '$currency',
            paidBy: { $cond: [{ $eq: ['$paidBy', 'other'] }, 'other', 'self'] },
          },
          minor: { $sum: '$amountMinor' },
        },
      },
    ]);

    const borrowed = await Expense.find({ ...match, paidBy: 'other', loanId: { $ne: null } })
      .select('amountMinor currency spentAt paidBy loanId')
      .lean();
    const summaries = await summarizeLoans(req.user.orgId, borrowed.map((expense) => expense.loanId));
    const repaid = new Map();
    borrowed.forEach((expense) => {
      const minor = repaidMinorOf(expense, summaries.get(String(expense.loanId)));
      if (minor <= 0) return;
      const key = `${new Date(expense.spentAt).toISOString().slice(0, 7)}|${expense.currency}`;
      repaid.set(key, (repaid.get(key) || 0) + minor);
    });

    const totals = buildTotals(groups, repaid).map((row) => ({
      month: row.month,
      currency: row.currency,
      self: toMajor(row.selfMinor),
      other: toMajor(row.otherMinor),
      repaid: toMajor(row.repaidMinor),
    }));
    res.json({ success: true, totals });
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

    const payer = parsePayer(body, { paidBy: 'self', payerName: '', givenTo: '' });
    if (!payer) return fail(res, 400, GENERIC_INVALID);

    const where = payer.paidBy === 'self' ? parseWhere(body.payMethod, body.payName) : { method: '', name: '' };
    if (!where) return fail(res, 400, GENERIC_INVALID);

    const relation = relationOf(payer);
    let loan = null;
    if (relation !== 'none') {
      loan = await attachExpense({
        orgId: req.user.orgId,
        userId: req.user.id,
        direction: directionOf(relation),
        person: personOf(payer),
        amountMinor,
        currency: body.currency,
        spentAt,
        note,
      });
    }

    let expense;
    try {
      expense = await Expense.create({
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
        givenTo: payer.givenTo,
        loanId: loan ? loan._id : null,
      });
    } catch (error) {
      if (loan) {
        const check = await checkDetach(loan, { _id: null, amountMinor });
        if (!check.error) await commitDetach(check).catch(() => null);
      }
      throw error;
    }

    const [dto] = await withLoans(req.user.orgId, [expense.toObject()]);
    res.status(201).json({ success: true, expense: dto });
  } catch (error) {
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

    const payer = parsePayer(body, { paidBy: expense.paidBy, payerName: expense.payerName, givenTo: expense.givenTo });
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

    const oldLoan = expense.loanId ? await Loan.findOne({ _id: expense.loanId, orgId: req.user.orgId }) : null;
    const oldRelation = relationOf(expense);
    const oldPerson = personOf(expense);
    const newRelation = relationOf(payer);
    const person = personOf(payer);
    const direction = directionOf(newRelation);
    let loanId = null;

    const attach = (prefer) =>
      attachExpense({
        orgId: req.user.orgId,
        userId: req.user.id,
        direction,
        person,
        amountMinor: next_.amountMinor,
        currency: next_.currency,
        spentAt: next_.spentAt,
        note: next_.note,
        prefer,
      });

    if (newRelation === 'none') {
      if (oldLoan) {
        const check = await checkDetach(oldLoan, expense);
        if (check.error) return fail(res, 400, LINKED_EDIT);
        await commitDetach(check);
      }
    } else if (oldLoan) {
      const same = oldLoan.direction === direction && oldLoan.currency === next_.currency && sameName(oldLoan.personName, person);
      if (same) {
        const paid = paidMinorOf(oldLoan);
        const newTotal = oldLoan.amountMinor - expense.amountMinor + next_.amountMinor;
        if (newTotal < Math.max(paid, 1)) return fail(res, 400, LINKED_EDIT);

        let sentAt = oldLoan.sentAt;
        let single = false;
        if (oldLoan.source === 'expense') {
          const others = await Expense.find({ orgId: req.user.orgId, loanId: oldLoan._id, _id: { $ne: expense._id } })
            .select('spentAt')
            .lean();
          single = others.length === 0;
          sentAt = [...others.map((item) => item.spentAt), next_.spentAt].reduce((min, date) => (date < min ? date : min));
          const first = firstPaymentOf(oldLoan);
          if (first && first < sentAt) return fail(res, 400, LINKED_EDIT);
        }
        oldLoan.amountMinor = newTotal;
        oldLoan.sentAt = sentAt;
        if (single) oldLoan.note = next_.note;
        await oldLoan.save();
        loanId = oldLoan._id;
      } else {
        const check = await checkDetach(oldLoan, expense);
        if (check.error) return fail(res, 400, LINKED_EDIT);
        const target = await attach(null);
        await commitDetach(check);
        loanId = target._id;
      }
    } else if (newRelation !== oldRelation || !sameName(person, oldPerson)) {
      const target = await attach(null);
      loanId = target._id;
    }

    Object.assign(expense, update, { paidBy: payer.paidBy, payerName: payer.payerName, givenTo: payer.givenTo, loanId });
    await expense.save();

    const [dto] = await withLoans(req.user.orgId, [expense.toObject()]);
    res.json({ success: true, expense: dto });
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
        const check = await checkDetach(loan, expense);
        if (check.error) return fail(res, 400, LINKED_DELETE);
        await commitDetach(check);
      }
    }

    await Expense.deleteOne({ _id: expense._id });
    res.json({ success: true });
  } catch (error) {
    handleError(res, next, error);
  }
};
