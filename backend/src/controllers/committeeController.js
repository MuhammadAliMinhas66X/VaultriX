import mongoose from 'mongoose';
import Committee from '../models/Committee.js';
import { toMajor, parseAmountMinor, parseDay, optionalText } from '../utils/financeInput.js';
import { isSupportedCurrency } from '../utils/currencies.js';
import { committeeSummary, FREQUENCIES } from '../utils/committee.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';
const MAX_COMMITTEES = 30;
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const dayOf = (date) => new Date(date).toISOString().slice(0, 10);
const todayOf = (raw) => (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) && parseDay(raw, { maxFutureDays: 2 }) ? raw : new Date().toISOString().slice(0, 10));

export const committeeDto = (committee, today) => {
  const summary = committeeSummary(committee, today);
  return {
    id: String(committee._id),
    name: committee.name,
    currency: committee.currency,
    contribution: toMajor(committee.contributionMinor),
    size: committee.size,
    frequency: committee.frequency,
    startDate: dayOf(committee.startDate),
    mySlot: committee.mySlot,
    rounds: summary.rounds,
    paidCount: summary.paidCount,
    paid: toMajor(summary.paidMinor),
    total: toMajor(summary.totalMinor),
    next: summary.next,
    overdueCount: summary.overdueCount,
    payout: toMajor(summary.payoutMinor),
    payoutDay: summary.payoutDay,
    payoutStatus: summary.payoutStatus,
    payoutReceivedAt: committee.payoutReceivedAt ? dayOf(committee.payoutReceivedAt) : null,
    endDay: summary.endDay,
    finished: summary.finished,
  };
};

const readFields = (body) => {
  const name = optionalText(body.name, 60);
  const contributionMinor = parseAmountMinor(body.contribution);
  const size = Number(body.size);
  const mySlot = Number(body.mySlot);
  const startDate = parseDay(body.startDate, { maxFutureDays: 365 * 2 });
  const frequency = body.frequency === undefined ? 'monthly' : body.frequency;
  if (!name || contributionMinor === undefined || !isSupportedCurrency(body.currency) || !startDate || !FREQUENCIES.includes(frequency)) return null;
  if (!Number.isInteger(size) || size < 2 || size > 60 || !Number.isInteger(mySlot) || mySlot < 1 || mySlot > size) return null;
  return { name, contributionMinor, currency: body.currency, size, mySlot, startDate, frequency };
};

export const listCommittees = async (req, res, next) => {
  try {
    const today = todayOf(req.query.today);
    const committees = await Committee.find({ orgId: req.user.orgId }).sort({ createdAt: 1 }).limit(MAX_COMMITTEES).lean();
    res.json({ success: true, committees: committees.map((item) => committeeDto(item, today)) });
  } catch (error) {
    next(error);
  }
};

export const createCommittee = async (req, res, next) => {
  try {
    const fields = readFields(req.body || {});
    if (!fields) return fail(res, 400, GENERIC_INVALID);
    if ((await Committee.countDocuments({ orgId: req.user.orgId })) >= MAX_COMMITTEES) return fail(res, 400, GENERIC_INVALID);
    const committee = await Committee.create({ ...fields, orgId: req.user.orgId, createdBy: req.user._id });
    res.status(201).json({ success: true, committee: committeeDto(committee, todayOf(req.query.today)) });
  } catch (error) {
    next(error);
  }
};

// Changing the money or the rhythm after payments exist would make them wrong, so the amount, size
// and rhythm only change while nothing is paid. The name and the user's own slot always can.
export const updateCommittee = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const fields = readFields(req.body || {});
    if (!fields) return fail(res, 400, GENERIC_INVALID);
    const current = await Committee.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!current) return fail(res, 404, NOT_FOUND);
    const locked = current.paid.length > 0 || current.payoutReceivedAt;
    if (locked) {
      const same = fields.contributionMinor === current.contributionMinor && fields.size === current.size && fields.frequency === current.frequency && fields.currency === current.currency && dayOf(fields.startDate) === dayOf(current.startDate);
      if (!same) return fail(res, 400, GENERIC_INVALID);
    }
    current.set({ name: fields.name, mySlot: fields.mySlot, ...(locked ? {} : fields) });
    await current.save();
    res.json({ success: true, committee: committeeDto(current, todayOf(req.query.today)) });
  } catch (error) {
    next(error);
  }
};

export const removeCommittee = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const result = await Committee.deleteOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!result.deletedCount) return fail(res, 404, NOT_FOUND);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// body: { round, date? }. The "round not paid yet" condition is part of the update, so a double tap
// cannot record the same round twice.
export const payRound = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const body = req.body || {};
    const round = Number(body.round);
    const date = body.date ? parseDay(body.date) : parseDay(new Date().toISOString().slice(0, 10));
    if (!Number.isInteger(round) || round < 1 || !date) return fail(res, 400, GENERIC_INVALID);
    const committee = await Committee.findOne({ _id: req.params.id, orgId: req.user.orgId }).lean();
    if (!committee) return fail(res, 404, NOT_FOUND);
    if (round > committee.size) return fail(res, 400, GENERIC_INVALID);
    const updated = await Committee.findOneAndUpdate(
      { _id: committee._id, orgId: req.user.orgId, 'paid.round': { $ne: round } },
      { $push: { paid: { round, paidAt: date, amountMinor: committee.contributionMinor } } },
      { new: true }
    ).lean();
    if (!updated) return fail(res, 400, GENERIC_INVALID);
    res.json({ success: true, committee: committeeDto(updated, todayOf(req.query.today)) });
  } catch (error) {
    next(error);
  }
};

export const undoRound = async (req, res, next) => {
  try {
    const round = Number(req.params.round);
    if (!mongoose.isValidObjectId(req.params.id) || !Number.isInteger(round)) return fail(res, 404, NOT_FOUND);
    const updated = await Committee.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId, 'paid.round': round }, { $pull: { paid: { round } } }, { new: true }).lean();
    if (!updated) return fail(res, 404, NOT_FOUND);
    res.json({ success: true, committee: committeeDto(updated, todayOf(req.query.today)) });
  } catch (error) {
    next(error);
  }
};

export const markPayout = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const body = req.body || {};
    const date = body.date ? parseDay(body.date) : parseDay(new Date().toISOString().slice(0, 10));
    if (!date) return fail(res, 400, GENERIC_INVALID);
    const exists = await Committee.exists({ _id: req.params.id, orgId: req.user.orgId });
    if (!exists) return fail(res, 404, NOT_FOUND);
    const updated = await Committee.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId, payoutReceivedAt: null }, { $set: { payoutReceivedAt: date } }, { new: true }).lean();
    if (!updated) return fail(res, 400, GENERIC_INVALID);
    res.json({ success: true, committee: committeeDto(updated, todayOf(req.query.today)) });
  } catch (error) {
    next(error);
  }
};

export const undoPayout = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const updated = await Committee.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId, payoutReceivedAt: { $ne: null } }, { $set: { payoutReceivedAt: null } }, { new: true }).lean();
    if (!updated) return fail(res, 404, NOT_FOUND);
    res.json({ success: true, committee: committeeDto(updated, todayOf(req.query.today)) });
  } catch (error) {
    next(error);
  }
};
