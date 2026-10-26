import IncomeStream, {
  INCOME_TYPE_VALUES,
  FREQUENCY_VALUES,
  DESTINATION_METHOD_VALUES,
} from '../models/IncomeStream.js';
import { cleanLabel, isCurrencyCode } from '../utils/validators.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const toMinor = (amount) => Math.round(Number(amount) * 100);
const toMajor = (minor) => (minor === null || minor === undefined ? null : Math.round(minor) / 100);

// typeDetail/destinationName are optional free text - looser than a
// label used as a primary name, so a short cleanLabel pass is enough
// (also accepts an empty string, cleanLabel does not).
const cleanOptionalLabel = (raw) => {
  if (raw === undefined || raw === null || raw === '') return '';
  const cleaned = cleanLabel(raw);
  return cleaned === null ? undefined : cleaned; // undefined = invalid, caller checks for it
};

const toIncomeStreamDto = (stream) => ({
  id: String(stream._id),
  name: stream.name,
  incomeType: stream.incomeType,
  typeDetail: stream.typeDetail || '',
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
    const { name, incomeType, typeDetail, frequency, destinationMethod, destinationName, expectedAmount, currency } =
      req.body || {};

    const cleanedName = cleanLabel(name);
    if (!cleanedName) return fail(res, 400, GENERIC_INVALID);

    const resolvedType = INCOME_TYPE_VALUES.includes(incomeType) ? incomeType : 'salaried';
    const resolvedFrequency = FREQUENCY_VALUES.includes(frequency) ? frequency : 'monthly';
    const resolvedMethod = DESTINATION_METHOD_VALUES.includes(destinationMethod) ? destinationMethod : 'bank';

    const cleanedDetail = cleanOptionalLabel(typeDetail);
    if (cleanedDetail === undefined) return fail(res, 400, GENERIC_INVALID);

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

    const { name, incomeType, typeDetail, frequency, destinationMethod, destinationName, expectedAmount, currency, isArchived } =
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
