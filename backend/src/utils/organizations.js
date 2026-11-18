import User from '../models/User.js';
import Organization from '../models/Organization.js';
import IncomeStream from '../models/IncomeStream.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';
import Loan from '../models/Loan.js';
import Expense from '../models/Expense.js';
import Bill from '../models/Bill.js';
import IncomeReceipt from '../models/IncomeReceipt.js';
import Invite from '../models/Invite.js';
import SalaryPlan from '../models/SalaryPlan.js';
import Budget from '../models/Budget.js';
import Goal from '../models/Goal.js';
import Committee from '../models/Committee.js';
import { isImageStorageReady } from '../config/cloudinary.js';
import { destroyByPrefix, loansPrefix, expensesPrefix } from '../services/imageStorage.js';

// When the owner of a shared workspace leaves, someone else must own it: first an admin,
// then a member, then a viewer (oldest account first). Returns the new owner id or null.
export const handOverWorkspace = async (user) => {
  if (!user || !user.orgId || user.role !== 'owner') return null;
  const others = await User.find({ orgId: user.orgId, _id: { $ne: user._id } }).select('role createdAt').sort({ createdAt: 1 }).lean();
  if (others.length === 0) return null;
  const rank = { admin: 0, member: 1, viewer: 2, owner: 0 };
  const next = [...others].sort((a, b) => (rank[a.role] ?? 3) - (rank[b.role] ?? 3))[0];
  await User.updateOne({ _id: next._id }, { $set: { role: 'owner' } });
  await Organization.updateOne({ _id: user.orgId }, { $set: { ownerId: next._id } });
  return String(next._id);
};

export const removeOrganizationIfEmpty = async (orgId) => {
  if (!orgId) return false;

  const remainingMembers = await User.countDocuments({ orgId });
  if (remainingMembers > 0) return false;

  if (isImageStorageReady()) {
    await destroyByPrefix(loansPrefix(orgId));
    await destroyByPrefix(expensesPrefix(orgId));
  }

  await Promise.all([
    IncomeStream.deleteMany({ orgId }),
    Account.deleteMany({ orgId }),
    Category.deleteMany({ orgId }),
    Loan.deleteMany({ orgId }),
    Expense.deleteMany({ orgId }),
    Bill.deleteMany({ orgId }),
    IncomeReceipt.deleteMany({ orgId }),
    Invite.deleteMany({ orgId }),
    SalaryPlan.deleteMany({ orgId }),
    Budget.deleteMany({ orgId }),
    Goal.deleteMany({ orgId }),
    Committee.deleteMany({ orgId }),
  ]);
  await Organization.deleteOne({ _id: orgId });
  return true;
};

export const findEmptyOrganizations = async () => {
  const organizations = await Organization.find({}, { _id: 1, name: 1, createdAt: 1 }).lean();
  const usedIds = new Set((await User.distinct('orgId')).map(String));
  return organizations.filter((organization) => !usedIds.has(String(organization._id)));
};

const GRACE_MS = 15 * 60 * 1000;
const SWEEP_EVERY_MS = 6 * 60 * 60 * 1000;

export const sweepEmptyOrganizations = async () => {
  const cutoff = new Date(Date.now() - GRACE_MS);
  const candidates = (await findEmptyOrganizations()).filter((organization) => organization.createdAt && organization.createdAt < cutoff);
  let removed = 0;
  for (const organization of candidates) {
    if (await removeOrganizationIfEmpty(organization._id)) removed += 1;
  }
  return removed;
};

export const startOrganizationSweeper = () => {
  const run = async () => {
    try {
      const removed = await sweepEmptyOrganizations();
      if (removed > 0) console.log(`Removed ${removed} empty organization(s).`);
    } catch (error) {
      console.error('Organization cleanup failed:', error.message);
    }
  };
  run();
  const timer = setInterval(run, SWEEP_EVERY_MS);
  timer.unref();
};
