import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Invite from '../models/Invite.js';
import IncomeStream from '../models/IncomeStream.js';
import IncomeReceipt from '../models/IncomeReceipt.js';
import Expense from '../models/Expense.js';
import Bill from '../models/Bill.js';
import Loan from '../models/Loan.js';
import Category from '../models/Category.js';
import { sendMail } from '../utils/mailer.js';
import { inviteEmail } from '../utils/mailTemplates.js';
import { parseEmail } from '../utils/emailValidation.js';
import { removeOrganizationIfEmpty } from '../utils/organizations.js';

const MAX_PEOPLE = 10;
const MAX_OPEN_INVITES = 10;
const INVITE_DAYS = 7;
const ASSIGNABLE = ['admin', 'member', 'viewer'];
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';
const NO_ACCESS = 'You do not have access to this.';
const TEAM_FULL = 'This workspace already has the most people it can hold.';
const INVITE_BAD = 'That invite code is not valid or has expired.';
const INVITE_EXISTS = 'There is already an open invite for that email.';
const ALREADY_MEMBER = 'That person is already in this workspace.';
const JOIN_HAS_DATA = 'Your account already has data of its own, so it cannot join another workspace.';
const JOIN_SHARED = 'You are already sharing a workspace with other people.';
const OWNER_FIXED = 'The owner cannot be changed or removed.';

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const hashCode = (code) => crypto.createHash('sha256').update(String(code).toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');

const makeCode = () => {
  const bytes = crypto.randomBytes(10);
  const chars = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
};

const memberDto = (user, ownerId) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  isOwner: String(user._id) === String(ownerId),
  joinedAt: user.createdAt,
});

const inviteDto = (invite) => ({ id: String(invite._id), email: invite.email, role: invite.role, expiresAt: invite.expiresAt, createdAt: invite.createdAt });

const canManage = (user) => user.role === 'owner' || user.role === 'admin';

export const listTeam = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.user.orgId).lean();
    const members = await User.find({ orgId: req.user.orgId }).select('name email role createdAt').sort({ createdAt: 1 }).lean();
    const invites = canManage(req.user) ? await Invite.find({ orgId: req.user.orgId }).sort({ createdAt: -1 }).lean() : [];
    res.json({
      success: true,
      workspace: organization ? organization.name : '',
      me: { id: String(req.user.id), role: req.user.role },
      members: members.map((member) => memberDto(member, organization && organization.ownerId)),
      invites: invites.map(inviteDto),
      limit: MAX_PEOPLE,
    });
  } catch (error) {
    next(error);
  }
};

export const createInvite = async (req, res, next) => {
  try {
    if (!canManage(req.user)) return fail(res, 403, NO_ACCESS);
    const body = req.body || {};
    const parsed = typeof body.email === 'string' ? parseEmail(body.email) : null;
    if (!parsed) return fail(res, 400, GENERIC_INVALID);
    if (!ASSIGNABLE.includes(body.role)) return fail(res, 400, GENERIC_INVALID);
    // Only the owner can hand out the admin role.
    if (body.role === 'admin' && req.user.role !== 'owner') return fail(res, 403, NO_ACCESS);

    const orgId = req.user.orgId;
    const [people, open] = await Promise.all([User.countDocuments({ orgId }), Invite.countDocuments({ orgId })]);
    if (people + open >= MAX_PEOPLE || open >= MAX_OPEN_INVITES) return fail(res, 400, TEAM_FULL);
    if (await User.exists({ orgId, email: parsed.email })) return fail(res, 409, ALREADY_MEMBER);
    if (await Invite.exists({ orgId, email: parsed.email })) return fail(res, 409, INVITE_EXISTS);

    const code = makeCode();
    const invite = await Invite.create({
      orgId,
      invitedBy: req.user.id,
      email: parsed.email,
      role: body.role,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    });

    const [organization, inviter] = await Promise.all([Organization.findById(orgId).lean(), User.findById(req.user.id).select('name').lean()]);
    sendMail({
      to: parsed.email,
      ...inviteEmail({ inviterName: inviter ? inviter.name : 'Someone', workspace: organization ? organization.name : 'a workspace', role: body.role, code, days: INVITE_DAYS }),
    }).catch((error) => console.error('Invite email failed:', error.message));

    res.status(201).json({ success: true, invite: inviteDto(invite), code });
  } catch (error) {
    next(error);
  }
};

export const revokeInvite = async (req, res, next) => {
  try {
    if (!canManage(req.user)) return fail(res, 403, NO_ACCESS);
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const removed = await Invite.findOneAndDelete({ _id: req.params.id, orgId: req.user.orgId });
    if (!removed) return fail(res, 404, NOT_FOUND);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const hasOwnData = async (orgId) => {
  const checks = await Promise.all(
    [IncomeStream, IncomeReceipt, Expense, Bill, Loan].map((model) => model.exists({ orgId })).concat(
      // The starter categories are made for everyone on first look, so they do not count.
      Category.exists({ orgId, isDefault: { $ne: true } })
    )
  );
  return checks.some(Boolean);
};

export const joinWithCode = async (req, res, next) => {
  try {
    const code = typeof (req.body || {}).code === 'string' ? req.body.code : '';
    if (code.replace(/[^A-Za-z0-9]/g, '').length !== 10) return fail(res, 400, INVITE_BAD);

    const me = await User.findById(req.user.id);
    if (!me) return fail(res, 404, NOT_FOUND);

    const invite = await Invite.findOne({ codeHash: hashCode(code), email: me.email, expiresAt: { $gt: new Date() } });
    if (!invite) return fail(res, 400, INVITE_BAD);
    if (String(invite.orgId) === String(me.orgId)) return fail(res, 409, ALREADY_MEMBER);

    // Joining throws away the person's own (empty) workspace, so refuse if it holds anything.
    if ((await User.countDocuments({ orgId: me.orgId })) > 1) return fail(res, 409, JOIN_SHARED);
    if (await hasOwnData(me.orgId)) return fail(res, 409, JOIN_HAS_DATA);

    const target = await User.countDocuments({ orgId: invite.orgId });
    if (target >= MAX_PEOPLE) return fail(res, 400, TEAM_FULL);

    const oldOrgId = me.orgId;
    me.orgId = invite.orgId;
    me.role = invite.role;
    await me.save();
    await Invite.deleteOne({ _id: invite._id });
    await removeOrganizationIfEmpty(oldOrgId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const startOwnWorkspace = async (user) => {
  const organization = await Organization.create({ name: `${user.name}'s workspace` });
  organization.ownerId = user._id;
  await organization.save();
  user.orgId = organization._id;
  user.role = 'owner';
  await user.save();
};

export const changeRole = async (req, res, next) => {
  try {
    if (req.user.role !== 'owner') return fail(res, 403, NO_ACCESS);
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const role = (req.body || {}).role;
    if (!ASSIGNABLE.includes(role)) return fail(res, 400, GENERIC_INVALID);
    const target = await User.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!target) return fail(res, 404, NOT_FOUND);
    if (target.role === 'owner') return fail(res, 400, OWNER_FIXED);
    target.role = role;
    await target.save();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const target = await User.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!target) return fail(res, 404, NOT_FOUND);
    if (target.role === 'owner') return fail(res, 400, OWNER_FIXED);
    // The owner removes anyone; an admin removes members and viewers.
    const allowed = req.user.role === 'owner' || (req.user.role === 'admin' && ['member', 'viewer'].includes(target.role));
    if (!allowed) return fail(res, 403, NO_ACCESS);
    await startOwnWorkspace(target);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const leaveWorkspace = async (req, res, next) => {
  try {
    if (req.user.role === 'owner') return fail(res, 400, OWNER_FIXED);
    const me = await User.findById(req.user.id);
    if (!me) return fail(res, 404, NOT_FOUND);
    await startOwnWorkspace(me);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
