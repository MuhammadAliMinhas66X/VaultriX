import IncomeStream, {
  INCOME_TYPE_VALUES,
  FREQUENCY_VALUES,
  DESTINATION_METHOD_VALUES,
} from '../models/IncomeStream.js';
import { cleanLabel, cleanFreeText, isCurrencyCode } from '../utils/validators.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const toMinor = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100);
const toMajor = (minor) => (minor === null || minor === undefined ? null : Math.round(minor) / 100);

// typeDetail/destinationName are open free text someone is describing in
// their own words ("Physical retail store", ".NET Web Developer") - using
// cleanLabel (which requires the text to START with a letter or digit,
// right for a primary name) here rejected perfectly normal detail text
// like ".NET Web Developer". cleanFreeText only trims, caps length, and
// blocks control characters. Also accepts/returns '' for "not provided",
// which cleanLabel/cleanFreeText alone do not.
const cleanOptionalLabel = (raw) => {
  if (raw === undefined || raw === null || raw === '') return '';
  const cleaned = cleanFreeText(raw);
  return cleaned === null ? undefined : cleaned; // undefined = invalid, caller checks for it
};

const MAX_DEDUCTIONS = 10;

const parseDeductions = (raw) => {
  if (!Array.isArray(raw) || raw.length > MAX_DEDUCTIONS) return undefined;
  const parsed = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return undefined;
    const name = cleanFreeText(item.name);
    const kind = item.kind === 'fixed' ? 'fixed' : item.kind === 'percent' ? 'percent' : null;
    const value = Number(item.value);
    if (!name || !kind || !Number.isFinite(value) || value < 0) return undefined;
    if (kind === 'percent') {
      if (value > 100) return undefined;
      parsed.push({ name, kind, percent: Math.round(value * 100) / 100, amountMinor: 0 });
    } else {
      if (value > 1e12) return undefined;
      parsed.push({ name, kind, percent: 0, amountMinor: toMinor(value) });
    }
  }
  return parsed;
};

const parseReceivedAt = (raw) => {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(raw)) return undefined;
  const date = new Date(`${raw.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  if (date.getUTCFullYear() < 2000) return undefined;
  if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) return undefined;
  return date;
};

const parseFlag = (raw) => (typeof raw === 'boolean' ? raw : undefined);

const toIncomeStreamDto = (stream) => ({
  id: String(stream._id),
  name: stream.name,
  incomeType: stream.incomeType,
  typeDetail: stream.typeDetail || '',
  payerName: stream.payerName || '',
  receivedAt: stream.receivedAt || stream.createdAt,
  taxEnabled: Boolean(stream.taxEnabled),
  deductionsEnabled: Boolean(stream.deductionsEnabled),
  deductFromTotal: Boolean(stream.deductFromTotal),
  deductions: (stream.deductions || []).map((item) => ({
    name: item.name,
    kind: item.kind,
    value: item.kind === 'fixed' ? toMajor(item.amountMinor) : item.percent,
  })),
  frequency: stream.frequency,
  destinationMethod: stream.destinationMethod,
  destinationName: stream.destinationName || '',
  expectedAmount: toMajor(stream.expectedAmountMinor ?? null),
  currency: stream.currency,
  isArchived: stream.isArchived,
  createdAt: stream.createdAt,
  updatedAt: stream.updatedAt,
});

// --- List -------------------------------------------------------------

export const listIncomeStreams = async (req, res, next) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const filter = { orgId: req.user.orgId };
    if (!includeArchived) filter.isArchived = false;

    const streams = await IncomeStream.find(filter).sort({ createdAt: 1 }).lean();

    res.json({ success: true, incomeStreams: streams.map(toIncomeStreamDto) });
  } catch (error) {
    next(error);
  }
};

// --- Create -------------------------------------------------------------

export const createIncomeStream = async (req, res, next) => {
  try {
    const { name, incomeType, typeDetail, payerName, receivedAt, frequency, destinationMethod, destinationName, expectedAmount, currency } =
      req.body || {};

    const cleanedName = cleanLabel(name);
    if (!cleanedName) return fail(res, 400, GENERIC_INVALID);

    const resolvedType = INCOME_TYPE_VALUES.includes(incomeType) ? incomeType : 'salaried';
    const resolvedFrequency = FREQUENCY_VALUES.includes(frequency) ? frequency : 'monthly';
    const resolvedMethod = DESTINATION_METHOD_VALUES.includes(destinationMethod) ? destinationMethod : 'bank';

    const cleanedDetail = cleanOptionalLabel(typeDetail);
    if (cleanedDetail === undefined) return fail(res, 400, GENERIC_INVALID);

    const cleanedPayer = cleanOptionalLabel(payerName);
    if (cleanedPayer === undefined) return fail(res, 400, GENERIC_INVALID);

    let resolvedReceivedAt = new Date();
    if (receivedAt !== undefined && receivedAt !== null && receivedAt !== '') {
      resolvedReceivedAt = parseReceivedAt(receivedAt);
      if (!resolvedReceivedAt) return fail(res, 400, GENERIC_INVALID);
    }

    // Cash needs no destination name; bank/wallet do - that's the one
    // piece of cross-field validation here.
    let cleanedDestination = '';
    if (resolvedMethod !== 'cash') {
      const parsed = cleanOptionalLabel(destinationName);
      if (!parsed) return fail(res, 400, GENERIC_INVALID);
      cleanedDestination = parsed;
    }

    if (!isCurrencyCode(currency)) return fail(res, 400, GENERIC_INVALID);

    let expectedAmountMinor = null;
    if (expectedAmount !== undefined && expectedAmount !== '' && expectedAmount !== null) {
      const parsed = Number(expectedAmount);
      if (!Number.isFinite(parsed) || parsed < 0) return fail(res, 400, GENERIC_INVALID);
      expectedAmountMinor = toMinor(parsed);
    }

    const stream = await IncomeStream.create({
      orgId: req.user.orgId,
      name: cleanedName,
      incomeType: resolvedType,
      typeDetail: cleanedDetail,
      payerName: cleanedPayer,
      receivedAt: resolvedReceivedAt,
      frequency: resolvedFrequency,
      destinationMethod: resolvedMethod,
      destinationName: cleanedDestination,
      expectedAmountMinor,
      currency,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, incomeStream: toIncomeStreamDto(stream.toObject()) });
  } catch (error) {
    next(error);
  }
};

// --- Update -------------------------------------------------------------

export const updateIncomeStream = async (req, res, next) => {
  try {
    const stream = await IncomeStream.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!stream) return fail(res, 404, NOT_FOUND);

    const { name, incomeType, typeDetail, payerName, receivedAt, frequency, destinationMethod, destinationName, expectedAmount, currency, isArchived, taxEnabled, deductionsEnabled, deductFromTotal, deductions } =
      req.body || {};
    const update = {};

    if (name !== undefined) {
      const cleanedName = cleanLabel(name);
      if (!cleanedName) return fail(res, 400, GENERIC_INVALID);
      update.name = cleanedName;
    }
    if (incomeType !== undefined) {
      if (!INCOME_TYPE_VALUES.includes(incomeType)) return fail(res, 400, GENERIC_INVALID);
      update.incomeType = incomeType;
    }
    if (typeDetail !== undefined) {
      const cleanedDetail = cleanOptionalLabel(typeDetail);
      if (cleanedDetail === undefined) return fail(res, 400, GENERIC_INVALID);
      update.typeDetail = cleanedDetail;
    }
    if (taxEnabled !== undefined) {
      if (parseFlag(taxEnabled) === undefined) return fail(res, 400, GENERIC_INVALID);
      update.taxEnabled = taxEnabled;
    }
    if (deductionsEnabled !== undefined) {
      if (parseFlag(deductionsEnabled) === undefined) return fail(res, 400, GENERIC_INVALID);
      update.deductionsEnabled = deductionsEnabled;
    }
    if (deductFromTotal !== undefined) {
      if (parseFlag(deductFromTotal) === undefined) return fail(res, 400, GENERIC_INVALID);
      update.deductFromTotal = deductFromTotal;
    }
    if (deductions !== undefined) {
      const parsedDeductions = parseDeductions(deductions);
      if (parsedDeductions === undefined) return fail(res, 400, GENERIC_INVALID);
      update.deductions = parsedDeductions;
    }
    if (receivedAt !== undefined) {
      const parsedReceived = parseReceivedAt(receivedAt);
      if (!parsedReceived) return fail(res, 400, GENERIC_INVALID);
      update.receivedAt = parsedReceived;
    }
    if (payerName !== undefined) {
      const cleanedPayer = cleanOptionalLabel(payerName);
      if (cleanedPayer === undefined) return fail(res, 400, GENERIC_INVALID);
      update.payerName = cleanedPayer;
    }
    if (frequency !== undefined) {
      if (!FREQUENCY_VALUES.includes(frequency)) return fail(res, 400, GENERIC_INVALID);
      update.frequency = frequency;
    }

    // Resolve the method+destination pair together (same cash exception
    // as create) using whichever value - new or already-saved - applies.
    const nextMethod = destinationMethod !== undefined ? destinationMethod : stream.destinationMethod;
    if (destinationMethod !== undefined) {
      if (!DESTINATION_METHOD_VALUES.includes(destinationMethod)) return fail(res, 400, GENERIC_INVALID);
      update.destinationMethod = destinationMethod;
    }
    if (destinationName !== undefined || destinationMethod !== undefined) {
      if (nextMethod === 'cash') {
        update.destinationName = '';
      } else if (destinationName !== undefined) {
        const parsed = cleanOptionalLabel(destinationName);
        if (!parsed) return fail(res, 400, GENERIC_INVALID);
        update.destinationName = parsed;
      } else if (!stream.destinationName) {
        // Switched from cash to bank/wallet without supplying a name.
        return fail(res, 400, GENERIC_INVALID);
      }
    }

    if (currency !== undefined) {
      if (!isCurrencyCode(currency)) return fail(res, 400, GENERIC_INVALID);
      update.currency = currency;
    }
    if (expectedAmount !== undefined) {
      if (expectedAmount === '' || expectedAmount === null) {
        update.expectedAmountMinor = null;
      } else {
        const parsed = Number(expectedAmount);
        if (!Number.isFinite(parsed) || parsed < 0) return fail(res, 400, GENERIC_INVALID);
        update.expectedAmountMinor = toMinor(parsed);
      }
    }
    if (isArchived !== undefined) {
      update.isArchived = Boolean(isArchived);
    }

    Object.assign(stream, update);
    await stream.save();

    res.json({ success: true, incomeStream: toIncomeStreamDto(stream.toObject()) });
  } catch (error) {
    if (error?.name === 'CastError') return fail(res, 404, NOT_FOUND);
    next(error);
  }
};

// --- Delete -------------------------------------------------------------
// Permanent, same reasoning as Account.deleteAccount - nothing references
// an income stream yet, so there's no history to lose. Revisit once
// Transactions can point at one.

export const deleteIncomeStream = async (req, res, next) => {
  try {
    const result = await IncomeStream.deleteOne({ _id: req.params.id, orgId: req.user.orgId });
    if (result.deletedCount === 0) return fail(res, 404, NOT_FOUND);
    res.json({ success: true });
  } catch (error) {
    if (error?.name === 'CastError') return fail(res, 404, NOT_FOUND);
    next(error);
  }
};
