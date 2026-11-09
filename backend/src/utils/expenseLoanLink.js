import mongoose from 'mongoose';
import Loan from '../models/Loan.js';
import Expense from '../models/Expense.js';
import { isImageStorageReady } from '../config/cloudinary.js';
import { destroyImage } from '../services/imageStorage.js';
import { toMajor } from './financeInput.js';

export const paidMinorOf = (loan) => (loan.payments || []).reduce((sum, item) => sum + item.amountMinor, 0);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export const relationOf = (expense) => {
  if (expense.givenTo) return 'given';
  return expense.paidBy === 'other' ? 'borrowed' : 'none';
};

export const personOf = (expense) => {
  if (expense.givenTo) return expense.givenTo;
  return expense.paidBy === 'other' ? expense.payerName : '';
};

export const directionOf = (relation) => (relation === 'given' ? 'lent' : 'borrowed');

const earliest = (dates) => dates.reduce((min, date) => (!min || date < min ? date : min), null);

export const firstPaymentOf = (loan) => earliest((loan.payments || []).map((item) => item.paidAt));

export const removeLoan = async (loan) => {
  if (loan.receivedProof?.publicId && isImageStorageReady()) await destroyImage(loan.receivedProof.publicId);
  await Loan.deleteOne({ _id: loan._id });
};

export const findOpenLoan = async (orgId, direction, personName, currency) => {
  const loans = await Loan.find({
    orgId,
    direction,
    currency,
    personName: new RegExp(`^${escapeRegex(String(personName).trim())}$`, 'i'),
  }).sort({ sentAt: -1, createdAt: -1 });
  return loans.find((loan) => loan.amountMinor > paidMinorOf(loan)) || null;
};

export const attachExpense = async ({ orgId, userId, direction, person, amountMinor, currency, spentAt, note, prefer }) => {
  let target = null;
  if (prefer && prefer.direction === direction && prefer.currency === currency && sameName(prefer.personName, person)) {
    target = prefer;
  } else {
    target = await findOpenLoan(orgId, direction, person, currency);
  }

  if (target) {
    target.amountMinor += amountMinor;
    if (target.source === 'expense' && spentAt < target.sentAt) target.sentAt = spentAt;
    await target.save();
    return target;
  }

  return Loan.create({
    orgId,
    createdBy: userId,
    direction,
    personName: person,
    amountMinor,
    currency,
    sentAt: spentAt,
    note,
    source: 'expense',
  });
};

export const checkDetach = async (loan, expense) => {
  const others = await Expense.find({ orgId: loan.orgId, loanId: loan._id, _id: { $ne: expense._id } })
    .select('spentAt')
    .lean();
  const paid = paidMinorOf(loan);
  const remaining = loan.amountMinor - expense.amountMinor;
  const firstPayment = firstPaymentOf(loan);

  if (others.length === 0 && loan.source === 'expense') {
    return loan.payments.length > 0 ? { error: true } : { empty: true, loan };
  }
  if (remaining < Math.max(paid, 1)) return { error: true };

  let sentAt = loan.sentAt;
  if (loan.source === 'expense') {
    sentAt = earliest(others.map((item) => item.spentAt));
    if (firstPayment && firstPayment < sentAt) return { error: true };
  }
  return { loan, remaining, sentAt };
};

export const commitDetach = async (check) => {
  if (check.empty) {
    await removeLoan(check.loan);
    return;
  }
  check.loan.amountMinor = check.remaining;
  check.loan.sentAt = check.sentAt;
  await check.loan.save();
};

export const summarizeLoans = async (orgId, loanIds) => {
  const ids = [...new Set(loanIds.filter(Boolean).map(String))];
  const map = new Map();
  if (ids.length === 0) return map;

  const [loans, counts] = await Promise.all([
    Loan.find({ _id: { $in: ids }, orgId }).lean(),
    Expense.aggregate([
      { $match: { orgId, loanId: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: '$loanId', entries: { $sum: 1 } } },
    ]),
  ]);
  const entryCount = new Map(counts.map((row) => [String(row._id), row.entries]));

  loans.forEach((loan) => {
    const paid = paidMinorOf(loan);
    const remaining = Math.max(0, loan.amountMinor - paid);
    map.set(String(loan._id), {
      id: String(loan._id),
      direction: loan.direction,
      personName: loan.personName,
      currency: loan.currency,
      amount: toMajor(loan.amountMinor),
      paid: toMajor(paid),
      remaining: toMajor(remaining),
      done: remaining === 0,
      fromExpense: loan.source === 'expense',
      entries: entryCount.get(String(loan._id)) || 0,
    });
  });
  return map;
};

export const entriesForLoans = async (orgId, loanIds) => {
  const ids = [...new Set(loanIds.filter(Boolean).map(String))];
  const map = new Map();
  if (ids.length === 0) return map;
  const expenses = await Expense.find({ orgId, loanId: { $in: ids } })
    .sort({ spentAt: 1, createdAt: 1 })
    .lean();
  expenses.forEach((expense) => {
    const key = String(expense.loanId);
    const list = map.get(key) || [];
    list.push({
      expenseId: String(expense._id),
      amount: toMajor(expense.amountMinor),
      spentAt: expense.spentAt,
      note: expense.note || '',
      categoryId: expense.categoryId ? String(expense.categoryId) : null,
    });
    map.set(key, list);
  });
  return map;
};
