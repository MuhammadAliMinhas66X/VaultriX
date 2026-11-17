import crypto from 'crypto';
import mongoose from 'mongoose';
import Group from '../models/Group.js';
import GroupExpense from '../models/GroupExpense.js';
import GroupSettlement from '../models/GroupSettlement.js';
import GroupInvite from '../models/GroupInvite.js';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import { sendMail } from '../utils/mailer.js';
import { groupInviteEmail } from '../utils/mailTemplates.js';
import { parseEmail } from '../utils/emailValidation.js';
import { isCurrencyCode, cleanLabel } from '../utils/validators.js';
import { toMajor, parseAmountMinor, parseDay, optionalText } from '../utils/financeInput.js';
import { splitEqual, computeBalances, suggestTransfers } from '../utils/groupMath.js';
import { deleteGroupCompletely } from '../utils/groups.js';

const MAX_MEMBERS = 12;
const MAX_GROUPS = 20;
const INVITE_DAYS = 7;
const LIST_LIMIT = 500;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';
const NO_ACCESS = 'You do not have access to this.';
const INVITE_BAD = 'That invite code is not valid or has expired.';
const INVITE_EXISTS = 'There is already an open invite for that email.';
const ALREADY_MEMBER = 'That person is already in this group.';
const GROUP_FULL = 'This group already has the most people it can hold.';
const GROUP_LIMIT = 'You are in the most groups you can be in.';
const LEAVE_OWING = 'Settle up first: you can only leave a group when nobody owes you and you owe nobody.';

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const hashCode = (code) => crypto.createHash('sha256').update(String(code).toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
const makeCode = () => {
  const chars = Array.from(crypto.randomBytes(10), (byte) => ALPHABET[byte % ALPHABET.length]).join('');
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
};

const activeIds = (group) => group.members.filter((member) => !member.left).map((member) => String(member.userId));
const isActive = (group, userId) => activeIds(group).includes(String(userId));

const findMine = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  return Group.findOne({ _id: req.params.id, members: { $elemMatch: { userId: req.user.id, left: { $ne: true } } } });
};

const expenseDto = (expense) => ({
  id: String(expense._id),
  description: expense.description,
  amount: toMajor(expense.amountMinor),
  currency: expense.currency,
  spentAt: expense.spentAt,
  paidBy: String(expense.paidBy),
  splitType: expense.splitType,
  shares: expense.shares.map((share) => ({ userId: String(share.userId), amount: toMajor(share.amountMinor) })),
  createdBy: expense.createdBy ? String(expense.createdBy) : null,
});

const settlementDto = (settlement) => ({
  id: String(settlement._id),
  fromUserId: String(settlement.fromUserId),
  toUserId: String(settlement.toUserId),
  amount: toMajor(settlement.amountMinor),
  currency: settlement.currency,
  paidAt: settlement.paidAt,
  note: settlement.note || '',
  createdBy: settlement.createdBy ? String(settlement.createdBy) : null,
});

const balancesFor = async (groupId) => {
  const [expenses, settlements] = await Promise.all([
    GroupExpense.find({ groupId }).select('currency paidBy amountMinor shares').lean(),
    GroupSettlement.find({ groupId }).select('currency fromUserId toUserId amountMinor').lean(),
  ]);
  return computeBalances(expenses, settlements);
};

const balancesDto = (byCurrency) =>
  Object.entries(byCurrency).map(([currency, balances]) => ({
    currency,
    balances: Object.entries(balances).filter(([, minor]) => minor !== 0).map(([userId, minor]) => ({ userId, amount: toMajor(minor) })),
    transfers: suggestTransfers(balances).map((t) => ({ fromUserId: t.fromUserId, toUserId: t.toUserId, amount: toMajor(t.amountMinor) })),
  }));

const memberDtos = async (group) => {
  const users = await User.find({ _id: { $in: group.members.map((member) => member.userId) } }).select('name email').lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  return group.members.map((member) => {
    const user = byId.get(String(member.userId));
    return { id: String(member.userId), name: (user && user.name) || member.name || '?', email: user ? user.email : '', left: Boolean(member.left), isCreator: String(member.userId) === String(group.createdBy) };
  });
};

export const listGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: { $elemMatch: { userId: req.user.id, left: { $ne: true } } } }).sort({ updatedAt: -1 }).limit(MAX_GROUPS).lean();
    const out = [];
    for (const group of groups) {
      const balances = await balancesFor(group._id);
      const mine = Object.entries(balances)
        .map(([currency, byUser]) => ({ currency, amount: toMajor(byUser[String(req.user.id)] || 0) }))
        .filter((row) => row.amount !== 0);
      out.push({ id: String(group._id), name: group.name, currency: group.currency, members: group.members.filter((m) => !m.left).length, memberNames: group.members.filter((m) => !m.left).map((m) => m.name).slice(0, 4), mine });
    }
    res.json({ success: true, groups: out });
  } catch (error) {
    next(error);
  }
};

export const createGroup = async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = cleanLabel(typeof body.name === 'string' ? body.name : '');
    if (!name || !isCurrencyCode(body.currency)) return fail(res, 400, GENERIC_INVALID);
    const mineCount = await Group.countDocuments({ members: { $elemMatch: { userId: req.user.id, left: { $ne: true } } } });
    if (mineCount >= MAX_GROUPS) return fail(res, 400, GROUP_LIMIT);
    const me = await User.findById(req.user.id).select('name').lean();
    const group = await Group.create({ name, currency: body.currency, createdBy: req.user.id, members: [{ userId: req.user.id, name: me ? me.name : '' }] });
    res.status(201).json({ success: true, id: String(group._id) });
  } catch (error) {
    next(error);
  }
};

export const getGroup = async (req, res, next) => {
  try {
    const group = await findMine(req);
    if (!group) return fail(res, 404, NOT_FOUND);
    const [expenses, settlements, invites, balances] = await Promise.all([
      GroupExpense.find({ groupId: group._id }).sort({ spentAt: -1, createdAt: -1 }).limit(LIST_LIMIT).lean(),
      GroupSettlement.find({ groupId: group._id }).sort({ paidAt: -1, createdAt: -1 }).limit(LIST_LIMIT).lean(),
      GroupInvite.find({ groupId: group._id }).sort({ createdAt: -1 }).lean(),
      balancesFor(group._id),
    ]);
    const mine = new Set(
      (await Expense.find({ orgId: req.user.orgId, groupExpenseId: { $in: expenses.map((e) => e._id) } }).select('groupExpenseId').lean()).map((e) => String(e.groupExpenseId))
    );
    res.json({
      success: true,
      group: { id: String(group._id), name: group.name, currency: group.currency, isCreator: String(group.createdBy) === String(req.user.id), limit: MAX_MEMBERS },
      me: String(req.user.id),
      members: await memberDtos(group),
      expenses: expenses.map((expense) => ({ ...expenseDto(expense), inMyExpenses: mine.has(String(expense._id)) })),
      settlements: settlements.map(settlementDto),
      invites: invites.map((invite) => ({ id: String(invite._id), email: invite.email, expiresAt: invite.expiresAt })),
      balances: balancesDto(balances),
      capped: expenses.length >= LIST_LIMIT,
    });
  } catch (error) {
    next(error);
  }
};

export const renameGroup = async (req, res, next) => {
  try {
    const group = await findMine(req);
    if (!group) return fail(res, 404, NOT_FOUND);
    if (String(group.createdBy) !== String(req.user.id)) return fail(res, 403, NO_ACCESS);
    const name = cleanLabel(typeof (req.body || {}).name === 'string' ? req.body.name : '');
    if (!name) return fail(res, 400, GENERIC_INVALID);
    group.name = name;
    await group.save();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const deleteGroup = async (req, res, next) => {
  try {
    const group = await findMine(req);
    if (!group) return fail(res, 404, NOT_FOUND);
    if (String(group.createdBy) !== String(req.user.id)) return fail(res, 403, NO_ACCESS);
    await deleteGroupCompletely(group._id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const leaveGroup = async (req, res, next) => {
  try {
    const group = await findMine(req);
    if (!group) return fail(res, 404, NOT_FOUND);
    const balances = await balancesFor(group._id);
    const owing = Object.values(balances).some((byUser) => (byUser[String(req.user.id)] || 0) !== 0);
    if (owing) return fail(res, 400, LEAVE_OWING);
    group.members.forEach((member) => {
      if (String(member.userId) === String(req.user.id)) member.left = true;
    });
    const active = group.members.filter((member) => !member.left);
    if (active.length === 0) {
      await deleteGroupCompletely(group._id);
    } else {
      if (String(group.createdBy) === String(req.user.id)) group.createdBy = active[0].userId;
      await group.save();
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// --- Invites -------------------------------------------------------------

export const createGroupInvite = async (req, res, next) => {
  try {
    const group = await findMine(req);
    if (!group) return fail(res, 404, NOT_FOUND);
    const parsed = typeof (req.body || {}).email === 'string' ? parseEmail(req.body.email) : null;
    if (!parsed) return fail(res, 400, GENERIC_INVALID);

    const open = await GroupInvite.countDocuments({ groupId: group._id });
    if (activeIds(group).length + open >= MAX_MEMBERS) return fail(res, 400, GROUP_FULL);
    const existing = await User.findOne({ email: parsed.email }).select('_id').lean();
    if (existing && isActive(group, existing._id)) return fail(res, 409, ALREADY_MEMBER);
    if (await GroupInvite.exists({ groupId: group._id, email: parsed.email })) return fail(res, 409, INVITE_EXISTS);

    const code = makeCode();
    const invite = await GroupInvite.create({
      groupId: group._id,
      invitedBy: req.user.id,
      email: parsed.email,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    });
    const inviter = await User.findById(req.user.id).select('name').lean();
    const known = Boolean(existing);
    sendMail({ to: parsed.email, ...groupInviteEmail({ inviterName: inviter ? inviter.name : 'Someone', group: group.name, code, days: INVITE_DAYS, hasAccount: known }) }).catch((error) =>
      console.error('Group invite email failed:', error.message)
    );
    res.status(201).json({ success: true, code, invite: { id: String(invite._id), email: invite.email, expiresAt: invite.expiresAt } });
  } catch (error) {
    next(error);
  }
};

export const revokeGroupInvite = async (req, res, next) => {
  try {
    const group = await findMine(req);
    if (!group || !mongoose.isValidObjectId(req.params.inviteId)) return fail(res, 404, NOT_FOUND);
    const removed = await GroupInvite.findOneAndDelete({ _id: req.params.inviteId, groupId: group._id });
    if (!removed) return fail(res, 404, NOT_FOUND);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Puts the signed-in person into the group an invite is for, then removes the invite.
const acceptInvite = async (req, res, invite, me) => {
  const group = await Group.findById(invite.groupId);
  if (!group) {
    await GroupInvite.deleteOne({ _id: invite._id });
    return fail(res, 400, INVITE_BAD);
  }
  if (isActive(group, req.user.id)) {
    await GroupInvite.deleteOne({ _id: invite._id });
    return fail(res, 409, ALREADY_MEMBER);
  }
  const mineCount = await Group.countDocuments({ members: { $elemMatch: { userId: req.user.id, left: { $ne: true } } } });
  if (mineCount >= MAX_GROUPS) return fail(res, 400, GROUP_LIMIT);
  if (activeIds(group).length >= MAX_MEMBERS) return fail(res, 400, GROUP_FULL);

  const previous = group.members.find((member) => String(member.userId) === String(req.user.id));
  if (previous) {
    previous.left = false;
    previous.name = me.name;
  } else {
    group.members.push({ userId: req.user.id, name: me.name });
  }
  await group.save();
  await GroupInvite.deleteOne({ _id: invite._id });
  return res.json({ success: true, id: String(group._id) });
};

export const joinGroup = async (req, res, next) => {
  try {
    const code = typeof (req.body || {}).code === 'string' ? req.body.code : '';
    if (code.replace(/[^A-Za-z0-9]/g, '').length !== 10) return fail(res, 400, INVITE_BAD);
    const me = await User.findById(req.user.id).select('name email').lean();
    if (!me) return fail(res, 404, NOT_FOUND);
    const invite = await GroupInvite.findOne({ codeHash: hashCode(code), email: me.email, expiresAt: { $gt: new Date() } });
    if (!invite) return fail(res, 400, INVITE_BAD);
    return await acceptInvite(req, res, invite, me);
  } catch (error) {
    return next(error);
  }
};

// Invitations waiting for the signed-in person, matched by their account email.
export const listMyInvites = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id).select('email').lean();
    if (!me) return fail(res, 404, NOT_FOUND);
    const invites = await GroupInvite.find({ email: me.email, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).limit(20).lean();
    const groups = await Group.find({ _id: { $in: invites.map((invite) => invite.groupId) } }).select('name members').lean();
    const inviters = await User.find({ _id: { $in: invites.map((invite) => invite.invitedBy).filter(Boolean) } }).select('name').lean();
    const groupById = new Map(groups.map((group) => [String(group._id), group]));
    const inviterById = new Map(inviters.map((user) => [String(user._id), user.name]));
    res.json({
      success: true,
      invites: invites
        .filter((invite) => groupById.has(String(invite.groupId)))
        .map((invite) => {
          const group = groupById.get(String(invite.groupId));
          return {
            id: String(invite._id),
            groupName: group.name,
            memberCount: group.members.filter((member) => !member.left).length,
            inviterName: inviterById.get(String(invite.invitedBy)) || '',
            expiresAt: invite.expiresAt,
          };
        }),
    });
  } catch (error) {
    next(error);
  }
};

const findMyInvite = async (req) => {
  if (!mongoose.isValidObjectId(req.params.inviteId)) return { invite: null };
  const me = await User.findById(req.user.id).select('name email').lean();
  if (!me) return { invite: null };
  const invite = await GroupInvite.findOne({ _id: req.params.inviteId, email: me.email, expiresAt: { $gt: new Date() } });
  return { invite, me };
};

export const acceptMyInvite = async (req, res, next) => {
  try {
    const { invite, me } = await findMyInvite(req);
    if (!invite) return fail(res, 404, NOT_FOUND);
    return await acceptInvite(req, res, invite, me);
  } catch (error) {
    return next(error);
  }
};

export const declineMyInvite = async (req, res, next) => {
  try {
    const { invite } = await findMyInvite(req);
    if (!invite) return fail(res, 404, NOT_FOUND);
    await GroupInvite.deleteOne({ _id: invite._id });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
};

// --- Expenses ------------------------------------------------------------

// Reads a shared cost from the request. Equal split: `participants` is the list of
// people sharing it. Exact split: `shares` gives each person's part and they must add up.
const readExpense = (group, body) => {
  const description = optionalText(body.description, 80);
  const amountMinor = parseAmountMinor(body.amount);
  const spentAt = parseDay(body.spentAt);
  const ids = activeIds(group);
  if (!description || amountMinor === undefined || !spentAt || !isCurrencyCode(body.currency)) return null;
  if (typeof body.paidBy !== 'string' || !ids.includes(body.paidBy)) return null;

  let shares;
  if (body.splitType === 'exact') {
    if (!Array.isArray(body.shares) || body.shares.length === 0 || body.shares.length > MAX_MEMBERS) return null;
    shares = [];
    const seen = new Set();
    for (const raw of body.shares) {
      const userId = raw && typeof raw.userId === 'string' ? raw.userId : '';
      const minor = parseAmountMinor(raw && raw.amount);
      if (!ids.includes(userId) || seen.has(userId) || minor === undefined) return null;
      seen.add(userId);
      shares.push({ userId, amountMinor: minor });
    }
    if (shares.reduce((sum, share) => sum + share.amountMinor, 0) !== amountMinor) return null;
  } else {
    const people = Array.isArray(body.participants) ? [...new Set(body.participants.map(String))] : [];
    if (people.length === 0 || people.some((id) => !ids.includes(id))) return null;
    shares = splitEqual(amountMinor, people);
  }
  return { description, amountMinor, currency: body.currency, spentAt, paidBy: body.paidBy, splitType: body.splitType === 'exact' ? 'exact' : 'equal', shares };
};

export const addGroupExpense = async (req, res, next) => {
  try {
    const group = await findMine(req);
    if (!group) return fail(res, 404, NOT_FOUND);
    const data = readExpense(group, req.body || {});
    if (!data) return fail(res, 400, GENERIC_INVALID);
    const expense = await GroupExpense.create({ ...data, groupId: group._id, createdBy: req.user.id });
    await Group.updateOne({ _id: group._id }, { $set: { updatedAt: new Date() } });
    res.status(201).json({ success: true, expense: expenseDto(expense) });
  } catch (error) {
    next(error);
  }
};

const findExpense = async (group, id) => (mongoose.isValidObjectId(id) ? GroupExpense.findOne({ _id: id, groupId: group._id }) : null);
const canEdit = (group, req, doc) => String(doc.createdBy) === String(req.user.id) || String(group.createdBy) === String(req.user.id);

export const updateGroupExpense = async (req, res, next) => {
  try {
    const group = await findMine(req);
    if (!group) return fail(res, 404, NOT_FOUND);
    const doc = await findExpense(group, req.params.expenseId);
    if (!doc) return fail(res, 404, NOT_FOUND);
    if (!canEdit(group, req, doc)) return fail(res, 403, NO_ACCESS);
    const data = readExpense(group, req.body || {});
    if (!data) return fail(res, 400, GENERIC_INVALID);
    Object.assign(doc, data);
    await doc.save();
    res.json({ success: true, expense: expenseDto(doc) });
  } catch (error) {
    next(error);
  }
};

export const deleteGroupExpense = async (req, res, next) => {
  try {
    const group = await findMine(req);
    if (!group) return fail(res, 404, NOT_FOUND);
    const doc = await findExpense(group, req.params.expenseId);
    if (!doc) return fail(res, 404, NOT_FOUND);
    if (!canEdit(group, req, doc)) return fail(res, 403, NO_ACCESS);
    await GroupExpense.deleteOne({ _id: doc._id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Copies MY share of a shared cost into my own private Expenses (once).
export const shareToMyExpenses = async (req, res, next) => {
  try {
    const group = await findMine(req);
    if (!group) return fail(res, 404, NOT_FOUND);
    const doc = await findExpense(group, req.params.expenseId);
    if (!doc) return fail(res, 404, NOT_FOUND);
    const share = doc.shares.find((item) => String(item.userId) === String(req.user.id));
    if (!share) return fail(res, 400, GENERIC_INVALID);
    if (await Expense.exists({ orgId: req.user.orgId, groupExpenseId: doc._id })) return res.json({ success: true, already: true });
    try {
      await Expense.create({
        orgId: req.user.orgId,
        createdBy: req.user.id,
        amountMinor: share.amountMinor,
        currency: doc.currency,
        categoryId: null,
        spentAt: doc.spentAt,
        note: `${group.name}: ${doc.description}`.slice(0, 200),
        paidBy: 'self',
        groupExpenseId: doc._id,
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// --- Settle up -----------------------------------------------------------

export const addSettlement = async (req, res, next) => {
  try {
    const group = await findMine(req);
    if (!group) return fail(res, 404, NOT_FOUND);
    const body = req.body || {};
    const ids = activeIds(group);
    const amountMinor = parseAmountMinor(body.amount);
    const paidAt = parseDay(body.paidAt);
    const note = optionalText(body.note, 120);
    if (amountMinor === undefined || !paidAt || note === undefined || !isCurrencyCode(body.currency)) return fail(res, 400, GENERIC_INVALID);
    if (!ids.includes(String(body.fromUserId)) || !ids.includes(String(body.toUserId)) || String(body.fromUserId) === String(body.toUserId)) return fail(res, 400, GENERIC_INVALID);
    const settlement = await GroupSettlement.create({
      groupId: group._id,
      createdBy: req.user.id,
      fromUserId: body.fromUserId,
      toUserId: body.toUserId,
      amountMinor,
      currency: body.currency,
      paidAt,
      note,
    });
    res.status(201).json({ success: true, settlement: settlementDto(settlement) });
  } catch (error) {
    next(error);
  }
};

export const deleteSettlement = async (req, res, next) => {
  try {
    const group = await findMine(req);
    if (!group || !mongoose.isValidObjectId(req.params.settlementId)) return fail(res, 404, NOT_FOUND);
    const doc = await GroupSettlement.findOne({ _id: req.params.settlementId, groupId: group._id });
    if (!doc) return fail(res, 404, NOT_FOUND);
    if (!canEdit(group, req, doc)) return fail(res, 403, NO_ACCESS);
    await GroupSettlement.deleteOne({ _id: doc._id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
