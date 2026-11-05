import mongoose from 'mongoose';
import Bill from '../models/Bill.js';
import Expense from '../models/Expense.js';
import Category from '../models/Category.js';
import { BILL_FREQUENCIES, addDays, defaultNextBillAt, makeAnchor, occurrenceDates, generationDate, skipMissed } from '../utils/billRecurrence.js';
import { isCurrencyCode, cleanLabel } from '../utils/validators.js';
import { toMajor, parseAmountMinor, parseDay, parseWhere, optionalText } from '../utils/financeInput.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';
const OVERPAY = 'That is more than what is left to pay.';
const CURRENCY_LOCKED = 'This bill already has payments, so its currency cannot be changed.';
const TOTAL_LOW = 'The total cannot be lower than what is already paid.';
const CANCELLED = 'This bill is cancelled, so it cannot take payments.';
const DELETE_PAID = 'This bill has payments. Delete the payments first, or cancel the bill instead.';

const LIST_LIMIT = 2000;
const CATCH_UP_LIMIT = 36;
const FAR_DAYS = 3660;

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const handleError = (res, next, error) => {
  if (error?.name === 'CastError' || error?.name === 'VersionError') return fail(res, 404, NOT_FOUND);
  return next(error);
};

const paidMinorOf = (bill) => (bill.payments || []).reduce((sum, item) => sum + item.amountMinor, 0);
const totalMinorOf = (bill) => bill.amountMinor + (bill.installationMinor || 0);

const toBillDto = (bill) => {
  const paid = paidMinorOf(bill);
  const total = totalMinorOf(bill);
  const recurring = bill.frequency !== 'none';
  return {
    id: String(bill._id),
    billerName: bill.billerName,
    billerId: bill.billerId || '',
    categoryId: bill.categoryId ? String(bill.categoryId) : null,
    amount: toMajor(bill.amountMinor),
    installation: toMajor(bill.installationMinor || 0),
    total: toMajor(total),
    paid: toMajor(paid),
    remaining: toMajor(Math.max(0, total - paid)),
    currency: bill.currency,
    dueAt: bill.dueAt,
    periodStart: bill.periodStart || null,
    periodEnd: bill.periodEnd || null,
    billerAccount: bill.billerAccount || '',
    payMethod: bill.payMethod || '',
    payName: bill.payName || '',
    note: bill.note || '',
    frequency: bill.frequency,
    seriesState: bill.seriesState,
    isHead: recurring && !bill.generated,
    nextBillAt: recurring && !bill.generated ? bill.nextBillAt || null : null,
    seriesId: String(bill.seriesId),
    sequence: bill.sequence,
    cancelledAt: bill.cancelledAt || null,
    createdAt: bill.createdAt,
    payments: (bill.payments || []).map((payment) => ({
      id: String(payment._id),
      amount: toMajor(payment.amountMinor),
      paidAt: payment.paidAt,
      payMethod: payment.payMethod || '',
      payName: payment.payName || '',
      note: payment.note || '',
      expenseId: payment.expenseId ? String(payment.expenseId) : null,
      createdAt: payment.createdAt,
    })),
  };
};

const expenseNote = (bill, note) => {
  const text = note ? `${bill.billerName} - ${note}` : bill.billerName;
  return text.slice(0, 200);
};

const resolveCategory = async (orgId, raw) => {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  if (!mongoose.isValidObjectId(raw)) return false;
  const found = await Category.findOne({ _id: raw, orgId, type: 'expense' }).lean();
  return found ? found._id : false;
};

const optionalMoney = (raw) => {
  if (raw === undefined || raw === null || raw === '' || Number(raw) === 0) return 0;
  const minor = parseAmountMinor(raw);
  return minor === undefined ? undefined : minor;
};

const optionalDay = (raw) => {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  return parseDay(raw, { maxFutureDays: FAR_DAYS }) || false;
};

const serverToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const readToday = (raw) => {
  const base = serverToday();
  const parsed = parseDay(raw, { maxFutureDays: 2 });
  if (!parsed || Math.abs(parsed.getTime() - base.getTime()) > 2 * 24 * 60 * 60 * 1000) return base;
  return parsed;
};

const nextOccurrence = (head) => {
  const anchor = head.anchor || makeAnchor(head);
  const sequence = head.nextSeq || head.sequence + 1;
  const dates = occurrenceDates(anchor, head.frequency, sequence);
  return {
    orgId: head.orgId,
    createdBy: head.createdBy,
    billerName: head.billerName,
    billerId: head.billerId,
    categoryId: head.categoryId,
    amountMinor: head.amountMinor,
    installationMinor: 0,
    currency: head.currency,
    dueAt: dates.dueAt,
    periodStart: dates.periodStart,
    periodEnd: dates.periodEnd,
    billerAccount: head.billerAccount,
    payMethod: head.payMethod,
    payName: head.payName,
    note: head.note,
    frequency: head.frequency,
    seriesState: head.seriesState,
    seriesId: head.seriesId,
    sequence,
    nextSeq: sequence + 1,
    nextBillAt: generationDate(anchor, head.frequency, sequence + 1),
    anchor,
    generated: false,
    payments: [],
  };
};

export const generateDueBills = async (orgId, today) => {
  let heads = await Bill.find({
    orgId,
    frequency: { $ne: 'none' },
    seriesState: 'active',
    generated: false,
    nextBillAt: { $ne: null, $lte: today },
  });

  let made = 0;
  for (let head of heads) {
    for (let step = 0; step < CATCH_UP_LIMIT; step += 1) {
      const claimed = await Bill.updateOne({ _id: head._id, generated: false }, { $set: { generated: true } });
      if (claimed.modifiedCount === 0) break;
      let created = null;
      try {
        created = await Bill.create(nextOccurrence(head));
        made += 1;
      } catch (error) {
        if (error?.code !== 11000) {
          await Bill.updateOne({ _id: head._id }, { $set: { generated: false } });
          throw error;
        }
      }
      if (!created || !created.nextBillAt || created.nextBillAt > today) break;
      head = created;
    }
  }
  return made;
};

export const listBills = async (req, res, next) => {
  try {
    const today = readToday(req.query.today);
    await generateDueBills(req.user.orgId, today);
    const bills = await Bill.find({ orgId: req.user.orgId }).sort({ dueAt: 1, createdAt: 1 }).limit(LIST_LIMIT).lean();
    res.json({ success: true, bills: bills.map(toBillDto) });
  } catch (error) {
    next(error);
  }
};

const findBill = (req) => Bill.findOne({ _id: req.params.id, orgId: req.user.orgId });

const parsePeriod = (body, current) => {
  const start = optionalDay(body.periodStart);
  const end = optionalDay(body.periodEnd);
  if (start === false || end === false) return undefined;
  const periodStart = start === undefined ? current.periodStart : start;
  const periodEnd = end === undefined ? current.periodEnd : end;
  if (periodStart && periodEnd && periodStart > periodEnd) return undefined;
  if ((periodStart && !periodEnd) || (!periodStart && periodEnd)) return undefined;
  return { periodStart: periodStart || null, periodEnd: periodEnd || null };
};

const parseSource = (body, current) => {
  if (body.payMethod === undefined) return { method: current.payMethod || '', name: current.payName || '' };
  return parseWhere(body.payMethod, body.payName);
};

const parseFrequency = (raw, fallback) => {
  if (raw === undefined) return fallback;
  return BILL_FREQUENCIES.includes(raw) ? raw : undefined;
};

const parseAccount = (raw, fallback) => {
  if (raw === undefined) return fallback;
  const value = optionalText(raw, 60);
  return value === undefined ? undefined : value;
};

export const createBill = async (req, res, next) => {
  try {
    const body = req.body || {};

    const billerName = cleanLabel(body.billerName);
    if (!billerName) return fail(res, 400, GENERIC_INVALID);

    const billerId = typeof body.billerId === 'string' ? body.billerId.replace(/[^a-z0-9_-]/gi, '').slice(0, 40) : '';

    const amountMinor = parseAmountMinor(body.amount);
    if (amountMinor === undefined) return fail(res, 400, GENERIC_INVALID);

    const installationMinor = optionalMoney(body.installation);
    if (installationMinor === undefined) return fail(res, 400, GENERIC_INVALID);

    if (!isCurrencyCode(body.currency)) return fail(res, 400, GENERIC_INVALID);

    const dueAt = parseDay(body.dueAt, { maxFutureDays: FAR_DAYS });
    if (!dueAt) return fail(res, 400, GENERIC_INVALID);

    const period = parsePeriod(body, { periodStart: null, periodEnd: null });
    if (!period) return fail(res, 400, GENERIC_INVALID);

    const categoryId = await resolveCategory(req.user.orgId, body.categoryId);
    if (categoryId === false) return fail(res, 400, GENERIC_INVALID);

    const where = parseSource(body, {});
    if (!where) return fail(res, 400, GENERIC_INVALID);

    const billerAccount = parseAccount(body.billerAccount, '');
    if (billerAccount === undefined) return fail(res, 400, GENERIC_INVALID);

    const note = optionalText(body.note, 200);
    if (note === undefined) return fail(res, 400, GENERIC_INVALID);

    const frequency = parseFrequency(body.frequency, 'none');
    if (!frequency) return fail(res, 400, GENERIC_INVALID);

    let nextBillAt = null;
    if (frequency !== 'none') {
      const given = optionalDay(body.nextBillAt);
      if (given === false) return fail(res, 400, GENERIC_INVALID);
      nextBillAt = given || defaultNextBillAt({ ...period, dueAt });
    }

    const _id = new mongoose.Types.ObjectId();
    const bill = new Bill({
      _id,
      orgId: req.user.orgId,
      createdBy: req.user.id,
      billerName,
      billerId,
      categoryId: categoryId ?? null,
      amountMinor,
      installationMinor,
      currency: body.currency,
      dueAt,
      ...period,
      billerAccount,
      payMethod: where.method,
      payName: where.name,
      note,
      frequency,
      seriesId: _id,
      sequence: 1,
      nextSeq: 2,
      nextBillAt,
    });
    if (frequency !== 'none') bill.anchor = makeAnchor(bill);
    await bill.save();

    res.status(201).json({ success: true, bill: toBillDto(bill.toObject()) });
  } catch (error) {
    handleError(res, next, error);
  }
};

const syncExpenses = async (bill) => {
  for (const payment of bill.payments) {
    if (!payment.expenseId) continue;
    await Expense.updateOne({ _id: payment.expenseId, billId: bill._id }, { $set: { categoryId: bill.categoryId, note: expenseNote(bill, payment.note) } });
  }
};

export const updateBill = async (req, res, next) => {
  try {
    const bill = await findBill(req);
    if (!bill) return fail(res, 404, NOT_FOUND);

    const body = req.body || {};
    const paid = paidMinorOf(bill);

    if (body.billerName !== undefined) {
      const billerName = cleanLabel(body.billerName);
      if (!billerName) return fail(res, 400, GENERIC_INVALID);
      bill.billerName = billerName;
    }

    if (body.billerId !== undefined) {
      bill.billerId = typeof body.billerId === 'string' ? body.billerId.replace(/[^a-z0-9_-]/gi, '').slice(0, 40) : '';
    }

    if (body.amount !== undefined) {
      const amountMinor = parseAmountMinor(body.amount);
      if (amountMinor === undefined) return fail(res, 400, GENERIC_INVALID);
      bill.amountMinor = amountMinor;
    }

    if (body.installation !== undefined) {
      const installationMinor = optionalMoney(body.installation);
      if (installationMinor === undefined) return fail(res, 400, GENERIC_INVALID);
      bill.installationMinor = installationMinor;
    }

    if (body.currency !== undefined) {
      if (!isCurrencyCode(body.currency)) return fail(res, 400, GENERIC_INVALID);
      if (body.currency !== bill.currency && bill.payments.length > 0) return fail(res, 400, CURRENCY_LOCKED);
      bill.currency = body.currency;
    }

    if (totalMinorOf(bill) < paid) return fail(res, 400, TOTAL_LOW);

    let datesChanged = false;
    if (body.dueAt !== undefined) {
      const dueAt = parseDay(body.dueAt, { maxFutureDays: FAR_DAYS });
      if (!dueAt) return fail(res, 400, GENERIC_INVALID);
      if (String(dueAt) !== String(bill.dueAt)) datesChanged = true;
      bill.dueAt = dueAt;
    }

    if (body.periodStart !== undefined || body.periodEnd !== undefined) {
      const period = parsePeriod(body, bill);
      if (!period) return fail(res, 400, GENERIC_INVALID);
      if (String(period.periodStart) !== String(bill.periodStart) || String(period.periodEnd) !== String(bill.periodEnd)) datesChanged = true;
      bill.periodStart = period.periodStart;
      bill.periodEnd = period.periodEnd;
    }

    if (body.categoryId !== undefined) {
      const categoryId = await resolveCategory(req.user.orgId, body.categoryId);
      if (categoryId === false) return fail(res, 400, GENERIC_INVALID);
      bill.categoryId = categoryId;
    }

    if (body.payMethod !== undefined) {
      const where = parseSource(body, bill);
      if (!where) return fail(res, 400, GENERIC_INVALID);
      bill.payMethod = where.method;
      bill.payName = where.name;
    }

    if (body.billerAccount !== undefined) {
      const billerAccount = parseAccount(body.billerAccount, bill.billerAccount);
      if (billerAccount === undefined) return fail(res, 400, GENERIC_INVALID);
      bill.billerAccount = billerAccount;
    }

    if (body.note !== undefined) {
      const note = optionalText(body.note, 200);
      if (note === undefined) return fail(res, 400, GENERIC_INVALID);
      bill.note = note;
    }

    const frequency = parseFrequency(body.frequency, bill.frequency);
    if (!frequency) return fail(res, 400, GENERIC_INVALID);
    const frequencyChanged = frequency !== bill.frequency;

    const head = bill.frequency !== 'none' && !bill.generated;
    let nextBillAt;
    if (body.nextBillAt !== undefined) {
      nextBillAt = optionalDay(body.nextBillAt);
      if (nextBillAt === false) return fail(res, 400, GENERIC_INVALID);
    }

    if (frequency === 'none') {
      if (frequencyChanged) {
        bill.frequency = 'none';
        bill.nextBillAt = null;
        bill.anchor = null;
        await Bill.updateMany({ orgId: bill.orgId, seriesId: bill.seriesId, _id: { $ne: bill._id } }, { $set: { frequency: 'none', nextBillAt: null } });
      }
    } else if (frequencyChanged && bill.frequency === 'none') {
      bill.frequency = frequency;
      bill.nextBillAt = nextBillAt || defaultNextBillAt(bill);
      bill.nextSeq = bill.sequence + 1;
      bill.generated = false;
      bill.anchor = makeAnchor(bill);
    } else if (head || frequencyChanged) {
      if (frequencyChanged) {
        bill.frequency = frequency;
        await Bill.updateMany({ orgId: bill.orgId, seriesId: bill.seriesId, _id: { $ne: bill._id } }, { $set: { frequency } });
      }
      if (head) {
        if (nextBillAt) bill.nextBillAt = nextBillAt;
        else if (datesChanged || frequencyChanged || !bill.nextBillAt) bill.nextBillAt = defaultNextBillAt(bill);
        bill.nextSeq = bill.sequence + 1;
        bill.anchor = makeAnchor(bill);
      }
    }

    await bill.save();
    await syncExpenses(bill);

    res.json({ success: true, bill: toBillDto(bill.toObject()) });
  } catch (error) {
    handleError(res, next, error);
  }
};

export const deleteBill = async (req, res, next) => {
  try {
    const bill = await findBill(req);
    if (!bill) return fail(res, 404, NOT_FOUND);
    if (bill.payments.length > 0) return fail(res, 400, DELETE_PAID);
    await Bill.deleteOne({ _id: bill._id });
    res.json({ success: true });
  } catch (error) {
    handleError(res, next, error);
  }
};

export const addBillPayment = async (req, res, next) => {
  let expense = null;
  try {
    const bill = await findBill(req);
    if (!bill) return fail(res, 404, NOT_FOUND);
    if (bill.cancelledAt) return fail(res, 400, CANCELLED);

    const body = req.body || {};
    const remaining = totalMinorOf(bill) - paidMinorOf(bill);

    const amountMinor = parseAmountMinor(body.amount);
    if (amountMinor === undefined) return fail(res, 400, GENERIC_INVALID);
    if (amountMinor > remaining) return fail(res, 400, OVERPAY);

    const paidAt = parseDay(body.paidAt);
    if (!paidAt) return fail(res, 400, GENERIC_INVALID);

    const where = parseSource(body, bill);
    if (!where) return fail(res, 400, GENERIC_INVALID);

    const note = optionalText(body.note, 200);
    if (note === undefined) return fail(res, 400, GENERIC_INVALID);

    const paymentId = new mongoose.Types.ObjectId();
    expense = await Expense.create({
      orgId: req.user.orgId,
      createdBy: req.user.id,
      amountMinor,
      currency: bill.currency,
      categoryId: bill.categoryId,
      spentAt: paidAt,
      note: expenseNote(bill, note),
      payMethod: where.method,
      payName: where.name,
      billId: bill._id,
      billPaymentId: paymentId,
    });

    bill.payments.push({ _id: paymentId, amountMinor, paidAt, payMethod: where.method, payName: where.name, note, expenseId: expense._id });
    await bill.save();

    res.status(201).json({ success: true, paymentId: String(paymentId), bill: toBillDto(bill.toObject()) });
  } catch (error) {
    if (expense) await Expense.deleteOne({ _id: expense._id }).catch(() => null);
    handleError(res, next, error);
  }
};

export const deleteBillPayment = async (req, res, next) => {
  try {
    const bill = await findBill(req);
    if (!bill) return fail(res, 404, NOT_FOUND);

    const payment = bill.payments.id(req.params.paymentId);
    if (!payment) return fail(res, 404, NOT_FOUND);

    const expenseId = payment.expenseId;
    payment.deleteOne();
    await bill.save();
    if (expenseId) await Expense.deleteOne({ _id: expenseId, billId: bill._id });

    res.json({ success: true, bill: toBillDto(bill.toObject()) });
  } catch (error) {
    handleError(res, next, error);
  }
};

export const setBillCancelled = async (req, res, next) => {
  try {
    const bill = await findBill(req);
    if (!bill) return fail(res, 404, NOT_FOUND);

    const cancelled = req.body?.cancelled;
    if (typeof cancelled !== 'boolean') return fail(res, 400, GENERIC_INVALID);

    bill.cancelledAt = cancelled ? new Date() : null;
    await bill.save();

    res.json({ success: true, bill: toBillDto(bill.toObject()) });
  } catch (error) {
    handleError(res, next, error);
  }
};

export const changeRecurring = async (req, res, next) => {
  try {
    const bill = await findBill(req);
    if (!bill) return fail(res, 404, NOT_FOUND);
    if (bill.frequency === 'none') return fail(res, 400, GENERIC_INVALID);

    const action = req.body?.action;
    const filter = { orgId: bill.orgId, seriesId: bill.seriesId };

    if (action === 'pause') {
      await Bill.updateMany(filter, { $set: { seriesState: 'paused' } });
    } else if (action === 'resume') {
      await Bill.updateMany(filter, { $set: { seriesState: 'active' } });
      const head = await Bill.findOne({ ...filter, generated: false });
      if (head && head.anchor) {
        const today = readToday(req.body?.today);
        head.nextSeq = skipMissed(head.anchor, head.frequency, head.nextSeq || head.sequence + 1, today);
        head.nextBillAt = generationDate(head.anchor, head.frequency, head.nextSeq);
        await head.save();
      }
    } else if (action === 'stop') {
      await Bill.updateMany(filter, { $set: { frequency: 'none', nextBillAt: null } });
    } else {
      return fail(res, 400, GENERIC_INVALID);
    }

    const fresh = await Bill.findOne({ _id: bill._id, orgId: bill.orgId }).lean();
    res.json({ success: true, bill: toBillDto(fresh) });
  } catch (error) {
    handleError(res, next, error);
  }
};
