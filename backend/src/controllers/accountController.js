import Account, { ACCOUNT_TYPE_VALUES } from '../models/Account.js';
import { cleanLabel, isCurrencyCode, isHexColor } from '../utils/validators.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const toMinor = (amount) => Math.round(Number(amount) * 100);
const toMajor = (minor) => Math.round(minor) / 100;

const toAccountDto = (account) => ({
  id: String(account._id),
  name: account.name,
  type: account.type,
  currency: account.currency,
  balance: toMajor(account.balanceMinor || 0),
  color: account.color,
  isArchived: account.isArchived,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
});

// --- List + the "central point of gravity" summary -------------------------------------------------------------

export const listAccounts = async (req, res, next) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const filter = { orgId: req.user.orgId };
    if (!includeArchived) filter.isArchived = false;

    const accounts = await Account.find(filter).sort({ createdAt: 1 }).lean();

    // Grouped by currency rather than one single number - summing two
    // different currencies into one figure would just be wrong, and this
    // app doesn't have an exchange-rate source to convert them honestly.
    // For the common case (everything in one currency) this still reads
    // as a single total, which is the point.
    const totalsByCurrency = {};
    accounts.forEach((a) => {
      if (a.isArchived) return;
      totalsByCurrency[a.currency] = (totalsByCurrency[a.currency] || 0) + (a.balanceMinor || 0);
    });

    res.json({
      success: true,
      accounts: accounts.map(toAccountDto),
      totals: Object.entries(totalsByCurrency).map(([currency, minor]) => ({ currency, total: toMajor(minor) })),
    });
  } catch (error) {
    next(error);
  }
};

// --- Create -------------------------------------------------------------

export const createAccount = async (req, res, next) => {
  try {
    const { name, type, currency, balance, color } = req.body || {};

    const cleanedName = cleanLabel(name);
    if (!cleanedName) return fail(res, 400, GENERIC_INVALID);

    const resolvedType = ACCOUNT_TYPE_VALUES.includes(type) ? type : 'checking';

    if (!isCurrencyCode(currency)) return fail(res, 400, GENERIC_INVALID);

    const startingBalance = balance === undefined || balance === '' ? 0 : Number(balance);
    if (!Number.isFinite(startingBalance)) return fail(res, 400, GENERIC_INVALID);

    const resolvedColor = isHexColor(color) ? color : '#111114';

    const account = await Account.create({
      orgId: req.user.orgId,
      name: cleanedName,
      type: resolvedType,
      currency,
      balanceMinor: toMinor(startingBalance),
      color: resolvedColor,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, account: toAccountDto(account.toObject()) });
  } catch (error) {
    next(error);
  }
};

// --- Update (including the only way to adjust a balance until
// Transactions ship and start doing it automatically) -------------------------------------------------------------

export const updateAccount = async (req, res, next) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!account) return fail(res, 404, NOT_FOUND);

    const { name, type, currency, balance, color, isArchived } = req.body || {};
    const update = {};

    if (name !== undefined) {
      const cleanedName = cleanLabel(name);
      if (!cleanedName) return fail(res, 400, GENERIC_INVALID);
      update.name = cleanedName;
    }
    if (type !== undefined) {
      if (!ACCOUNT_TYPE_VALUES.includes(type)) return fail(res, 400, GENERIC_INVALID);
      update.type = type;
    }
    if (currency !== undefined) {
      if (!isCurrencyCode(currency)) return fail(res, 400, GENERIC_INVALID);
      update.currency = currency;
    }
    if (balance !== undefined) {
      const nextBalance = Number(balance);
      if (!Number.isFinite(nextBalance)) return fail(res, 400, GENERIC_INVALID);
      update.balanceMinor = toMinor(nextBalance);
    }
    if (color !== undefined) {
      if (!isHexColor(color)) return fail(res, 400, GENERIC_INVALID);
      update.color = color;
    }
    if (isArchived !== undefined) {
      update.isArchived = Boolean(isArchived);
    }

    Object.assign(account, update);
    await account.save();

    res.json({ success: true, account: toAccountDto(account.toObject()) });
  } catch (error) {
    if (error?.name === 'CastError') return fail(res, 404, NOT_FOUND);
    next(error);
  }
};

// --- Delete -------------------------------------------------------------
// Permanent, not a soft delete - isArchived (set via updateAccount) is the
// reversible "hide this but keep the history" option. Safe to actually
// remove the row for now because nothing references an account yet; once
// Transactions exist, this will need to either block the delete or cascade,
// and that decision belongs with that feature, not bolted on here early.

export const deleteAccount = async (req, res, next) => {
  try {
    const result = await Account.deleteOne({ _id: req.params.id, orgId: req.user.orgId });
    if (result.deletedCount === 0) return fail(res, 404, NOT_FOUND);
    res.json({ success: true });
  } catch (error) {
    if (error?.name === 'CastError') return fail(res, 404, NOT_FOUND);
    next(error);
  }
};
