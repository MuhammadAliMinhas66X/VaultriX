import User from '../models/User.js';
import Organization from '../models/Organization.js';
import IncomeStream from '../models/IncomeStream.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';
import Loan from '../models/Loan.js';
import Expense from '../models/Expense.js';
import { isImageStorageReady } from '../config/cloudinary.js';
import { destroyByPrefix, loansPrefix } from '../services/imageStorage.js';

export const removeOrganizationIfEmpty = async (orgId) => {
  if (!orgId) return false;

  const remainingMembers = await User.countDocuments({ orgId });
  if (remainingMembers > 0) return false;

  if (isImageStorageReady()) await destroyByPrefix(loansPrefix(orgId));

  await Promise.all([
    IncomeStream.deleteMany({ orgId }),
    Account.deleteMany({ orgId }),
    Category.deleteMany({ orgId }),
    Loan.deleteMany({ orgId }),
    Expense.deleteMany({ orgId }),
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
