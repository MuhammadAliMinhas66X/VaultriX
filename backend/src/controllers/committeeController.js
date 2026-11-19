import mongoose from 'mongoose';
import Committee from '../models/Committee.js';
import User from '../models/User.js';
import { toMajor, parseAmountMinor, parseDay, optionalText } from '../utils/financeInput.js';
import { isSupportedCurrency } from '../utils/currencies.js';
import { committeeSummary, assignWinner, slotsAreValid, FREQUENCIES, ROLES } from '../utils/committee.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';
const NO_ACCOUNT = 'No Vaultrix account uses that email. Add the person by name instead.';
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_COMMITTEES = 30;
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const dayOf = (date) => new Date(date).toISOString().slice(0, 10);
const todayOf = (raw) => (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) && parseDay(raw, { maxFutureDays: 2 }) ? raw : new Date().toISOString().slice(0, 10));
const validId = (...ids) => ids.every((id) => mongoose.isValidObjectId(id));
const hasPayments = (committee) => committee.paid.length > 0 || Boolean(committee.payoutReceivedAt) || (committee.payouts || []).length > 0 || (committee.members || []).some((member) => member.payments.length > 0);

export const committeeDto = (committee, today) => {
  const summary = committeeSummary(committee, today);
  return {
    id: String(committee._id),
    name: committee.name,
    role: committee.role || 'member',
    currency: committee.currency,
    contribution: toMajor(committee.contributionMinor),
    size: committee.size,
    frequency: committee.frequency,
    startDate: dayOf(committee.startDate),
    mySlot: committee.mySlot ?? null,
    rounds: summary.rounds.map(({ collectedMinor, ...item }) => ({ ...item, collectedAmount: toMajor(collectedMinor) })),
    pot: toMajor(committee.contributionMinor * committee.size),
    collectedTotal: toMajor(summary.rounds.reduce((sum, item) => sum + item.collectedMinor, 0)),
    expectedTotal: toMajor(summary.rounds.filter((item) => item.due <= today).length * committee.contributionMinor * (committee.role === 'organizer' ? committee.size : 1)),
    dueRounds: summary.rounds.filter((item) => item.due <= today).length,
    members: summary.members.map((member) => ({ id: member.id, name: member.name, slot: member.slot, linked: Boolean(member.userId), email: member.email || '', paidRounds: member.paidRounds, lateRounds: member.lateRounds, paid: toMajor(member.paidMinor) })),
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
    owed: toMajor(summary.owedMinor),
    lateMembers: summary.lateMembers,
    potsToHandOver: summary.potsToHandOver,
    missingNames: summary.missingNames,
    finished: summary.finished,
  };
};

const cleanNames = (raw, size) => {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length > size - 1) return null;
  const names = raw.map((item) => optionalText(item, 40));
  return names.every(Boolean) ? names : null;
};

const readFields = (body) => {
  const name = optionalText(body.name, 60);
  const contributionMinor = parseAmountMinor(body.contribution);
  const size = Number(body.size);
  const hasSlot = body.mySlot !== null && body.mySlot !== undefined && body.mySlot !== '';
  const mySlot = hasSlot ? Number(body.mySlot) : null;
  const startDate = parseDay(body.startDate, { maxFutureDays: 365 * 2 });
  const frequency = body.frequency === undefined ? 'monthly' : body.frequency;
  const role = body.role === undefined ? 'member' : body.role;
  if (!name || contributionMinor === undefined || !isSupportedCurrency(body.currency) || !startDate || !FREQUENCIES.includes(frequency) || !ROLES.includes(role)) return null;
  if (!Number.isInteger(size) || size < 2 || size > 60) return null;
  if (hasSlot && (!Number.isInteger(mySlot) || mySlot < 1 || mySlot > size)) return null;
  const names = cleanNames(body.memberNames, size);
  if (names === null) return null;
  return { name, contributionMinor, currency: body.currency, size, mySlot, startDate, frequency, role, names };
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
    const { names, ...rest } = fields;
    const committee = await Committee.create({ ...rest, members: (names || []).map((name) => ({ name })), orgId: req.user.orgId, createdBy: req.user._id });
    res.status(201).json({ success: true, committee: committeeDto(committee.toObject(), todayOf(req.query.today)) });
  } catch (error) {
    next(error);
  }
};

// Changing the money or the rhythm after payments exist would make them wrong, so the amount, size
// and rhythm only change while nothing is recorded. The name, role and the user's own slot always can.
// A new turn only needs to be free: the round must not already belong to someone else.
export const updateCommittee = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const fields = readFields(req.body || {});
    if (!fields) return fail(res, 400, GENERIC_INVALID);
    const current = await Committee.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!current) return fail(res, 404, NOT_FOUND);
    const locked = hasPayments(current);
    if (locked) {
      const same = fields.contributionMinor === current.contributionMinor && fields.size === current.size && fields.frequency === current.frequency && fields.currency === current.currency && dayOf(fields.startDate) === dayOf(current.startDate);
      if (!same) return fail(res, 400, GENERIC_INVALID);
    }
    const { names, ...rest } = fields;
    const next = { name: rest.name, role: rest.role, mySlot: rest.mySlot };
    if (!locked) Object.assign(next, rest);
    if (current.members.length + 1 > (locked ? current.size : rest.size)) return fail(res, 400, GENERIC_INVALID);
    current.set(next);
    if (!slotsAreValid(current)) return fail(res, 400, GENERIC_INVALID);
    await current.save();
    res.json({ success: true, committee: committeeDto(current.toObject(), todayOf(req.query.today)) });
  } catch (error) {
    next(error);
  }
};

export const removeCommittee = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const result = await Committee.deleteOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!result.deletedCount) return fail(res, 404, NOT_FOUND);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const readRoundBody = (req, size) => {
  const body = req.body || {};
  const round = Number(body.round ?? req.params.round);
  const date = body.date ? parseDay(body.date) : parseDay(new Date().toISOString().slice(0, 10));
  if (!Number.isInteger(round) || round < 1 || round > size || !date) return null;
  return { round, date };
};

const send = (res, doc, req, status = 200) => res.status(status).json({ success: true, committee: committeeDto(doc, todayOf(req.query.today)) });

// body: { round, date? }. The "round not paid yet" condition is part of the update, so a double tap
// cannot record the same round twice.
export const payRound = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const committee = await Committee.findOne({ _id: req.params.id, orgId: req.user.orgId }).lean();
    if (!committee) return fail(res, 404, NOT_FOUND);
    const input = readRoundBody(req, committee.size);
    if (!input) return fail(res, 400, GENERIC_INVALID);
    const updated = await Committee.findOneAndUpdate(
      { _id: committee._id, orgId: req.user.orgId, 'paid.round': { $ne: input.round } },
      { $push: { paid: { round: input.round, paidAt: input.date, amountMinor: committee.contributionMinor } } },
      { new: true }
    ).lean();
    if (!updated) return fail(res, 400, GENERIC_INVALID);
    send(res, updated, req);
  } catch (error) {
    next(error);
  }
};

export const undoRound = async (req, res, next) => {
  try {
    const round = Number(req.params.round);
    if (!validId(req.params.id) || !Number.isInteger(round)) return fail(res, 404, NOT_FOUND);
    const updated = await Committee.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId, 'paid.round': round }, { $pull: { paid: { round } } }, { new: true }).lean();
    if (!updated) return fail(res, 404, NOT_FOUND);
    send(res, updated, req);
  } catch (error) {
    next(error);
  }
};

export const markPayout = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const body = req.body || {};
    const date = body.date ? parseDay(body.date) : parseDay(new Date().toISOString().slice(0, 10));
    if (!date) return fail(res, 400, GENERIC_INVALID);
    const exists = await Committee.exists({ _id: req.params.id, orgId: req.user.orgId });
    if (!exists) return fail(res, 404, NOT_FOUND);
    const updated = await Committee.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId, payoutReceivedAt: null }, { $set: { payoutReceivedAt: date } }, { new: true }).lean();
    if (!updated) return fail(res, 400, GENERIC_INVALID);
    send(res, updated, req);
  } catch (error) {
    next(error);
  }
};

export const undoPayout = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const updated = await Committee.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId, payoutReceivedAt: { $ne: null } }, { $set: { payoutReceivedAt: null } }, { new: true }).lean();
    if (!updated) return fail(res, 404, NOT_FOUND);
    send(res, updated, req);
  } catch (error) {
    next(error);
  }
};

// ---- Members (the organizer's list of people) ----

// body: { name }. Never more than size - 1 people besides me.
export const addMember = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const input = optionalText((req.body || {}).name, 80);
    if (!input) return fail(res, 400, GENERIC_INVALID);
    let member = { name: input.slice(0, 40) };
    // Something with an @ is an email: it must belong to a Vaultrix account, and the person is linked to it.
    if (input.includes('@')) {
      const email = input.toLowerCase();
      if (!EMAIL_SHAPE.test(email)) return fail(res, 400, GENERIC_INVALID);
      const account = await User.findOne({ email }).select('name email').lean();
      if (!account) return fail(res, 404, NO_ACCOUNT);
      member = { name: String(account.name || email.split('@')[0]).slice(0, 40), email, userId: account._id };
    }
    const committee = await Committee.findOne({ _id: req.params.id, orgId: req.user.orgId }).lean();
    if (!committee) return fail(res, 404, NOT_FOUND);
    if (member.userId && (committee.members || []).some((item) => String(item.userId) === String(member.userId))) return fail(res, 400, GENERIC_INVALID);
    const updated = await Committee.findOneAndUpdate(
      { _id: committee._id, orgId: req.user.orgId, [`members.${committee.size - 1 - 1}`]: { $exists: false } },
      { $push: { members: member } },
      { new: true }
    ).lean();
    if (!updated) return fail(res, 400, GENERIC_INVALID);
    send(res, updated, req, 201);
  } catch (error) {
    next(error);
  }
};

export const renameMember = async (req, res, next) => {
  try {
    if (!validId(req.params.id, req.params.memberId)) return fail(res, 404, NOT_FOUND);
    const name = optionalText((req.body || {}).name, 40);
    if (!name) return fail(res, 400, GENERIC_INVALID);
    const updated = await Committee.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId, 'members._id': req.params.memberId }, { $set: { 'members.$.name': name } }, { new: true }).lean();
    if (!updated) return fail(res, 404, NOT_FOUND);
    send(res, updated, req);
  } catch (error) {
    next(error);
  }
};

// A person with recorded payments or a round cannot disappear: their history would be lost.
export const removeMember = async (req, res, next) => {
  try {
    if (!validId(req.params.id, req.params.memberId)) return fail(res, 404, NOT_FOUND);
    const updated = await Committee.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId, members: { $elemMatch: { _id: req.params.memberId, slot: null, 'payments.0': { $exists: false } } } },
      { $pull: { members: { _id: req.params.memberId } } },
      { new: true }
    ).lean();
    if (!updated) return fail(res, 400, GENERIC_INVALID);
    send(res, updated, req);
  } catch (error) {
    next(error);
  }
};

// body: { round, date? }. Marks that this member paid me for the round (conditional, so a double tap
// cannot record it twice).
export const payForMember = async (req, res, next) => {
  try {
    if (!validId(req.params.id, req.params.memberId)) return fail(res, 404, NOT_FOUND);
    const committee = await Committee.findOne({ _id: req.params.id, orgId: req.user.orgId }).lean();
    if (!committee) return fail(res, 404, NOT_FOUND);
    const input = readRoundBody(req, committee.size);
    if (!input) return fail(res, 400, GENERIC_INVALID);
    const updated = await Committee.findOneAndUpdate(
      { _id: committee._id, orgId: req.user.orgId, members: { $elemMatch: { _id: req.params.memberId, 'payments.round': { $ne: input.round } } } },
      { $push: { 'members.$.payments': { round: input.round, paidAt: input.date, amountMinor: committee.contributionMinor } } },
      { new: true }
    ).lean();
    if (!updated) return fail(res, 400, GENERIC_INVALID);
    send(res, updated, req);
  } catch (error) {
    next(error);
  }
};

export const undoMemberPayment = async (req, res, next) => {
  try {
    const round = Number(req.params.round);
    if (!validId(req.params.id, req.params.memberId) || !Number.isInteger(round)) return fail(res, 404, NOT_FOUND);
    const updated = await Committee.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId, members: { $elemMatch: { _id: req.params.memberId, 'payments.round': round } } },
      { $pull: { 'members.$.payments': { round } } },
      { new: true }
    ).lean();
    if (!updated) return fail(res, 404, NOT_FOUND);
    send(res, updated, req);
  } catch (error) {
    next(error);
  }
};

// Everyone who has not paid the round yet is marked paid (me included only through my own button).
export const collectRound = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const committee = await Committee.findOne({ _id: req.params.id, orgId: req.user.orgId }).lean();
    if (!committee) return fail(res, 404, NOT_FOUND);
    const input = readRoundBody(req, committee.size);
    if (!input) return fail(res, 400, GENERIC_INVALID);
    const updated = await Committee.findOneAndUpdate(
      { _id: committee._id, orgId: req.user.orgId },
      { $push: { 'members.$[m].payments': { round: input.round, paidAt: input.date, amountMinor: committee.contributionMinor } } },
      { new: true, arrayFilters: [{ 'm.payments.round': { $ne: input.round } }] }
    ).lean();
    send(res, updated, req);
  } catch (error) {
    next(error);
  }
};

// ---- Draw and hand-over ----

// body: { holder: 'me' | memberId | null }. Who takes the pot in this round. One round, one winner.
export const setWinner = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const round = Number(req.params.round);
    const holder = (req.body || {}).holder ?? null;
    if (holder !== null && holder !== 'me' && !validId(holder)) return fail(res, 400, GENERIC_INVALID);
    const committee = await Committee.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!committee) return fail(res, 404, NOT_FOUND);
    if (!Number.isInteger(round) || round < 1 || round > committee.size) return fail(res, 400, GENERIC_INVALID);
    const result = assignWinner(committee, round, holder);
    if (!result) return fail(res, 400, GENERIC_INVALID);
    // A turn that was already handed over or received cannot be moved to someone else.
    const closed = (committee.payouts || []).some((item) => item.round === round) || (committee.mySlot === round && committee.payoutReceivedAt);
    if (closed) return fail(res, 400, GENERIC_INVALID);
    committee.mySlot = result.mySlot;
    committee.members.forEach((member) => {
      member.slot = result.slots.get(String(member._id)) ?? null;
    });
    if (!slotsAreValid(committee)) return fail(res, 400, GENERIC_INVALID);
    await committee.save();
    send(res, committee.toObject(), req);
  } catch (error) {
    next(error);
  }
};

// Organizer: the pot of round `round` was handed to that round's winner.
export const markHandedOver = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const committee = await Committee.findOne({ _id: req.params.id, orgId: req.user.orgId }).lean();
    if (!committee) return fail(res, 404, NOT_FOUND);
    const input = readRoundBody(req, committee.size);
    if (!input) return fail(res, 400, GENERIC_INVALID);
    const updated = await Committee.findOneAndUpdate(
      { _id: committee._id, orgId: req.user.orgId, 'payouts.round': { $ne: input.round } },
      { $push: { payouts: { round: input.round, paidAt: input.date } } },
      { new: true }
    ).lean();
    if (!updated) return fail(res, 400, GENERIC_INVALID);
    send(res, updated, req);
  } catch (error) {
    next(error);
  }
};

export const undoHandedOver = async (req, res, next) => {
  try {
    const round = Number(req.params.round);
    if (!validId(req.params.id) || !Number.isInteger(round)) return fail(res, 404, NOT_FOUND);
    const updated = await Committee.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId, 'payouts.round': round }, { $pull: { payouts: { round } } }, { new: true }).lean();
    if (!updated) return fail(res, 404, NOT_FOUND);
    send(res, updated, req);
  } catch (error) {
    next(error);
  }
};
