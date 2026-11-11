import mongoose from 'mongoose';
import IncomeReceipt from '../models/IncomeReceipt.js';
import IncomeStream from '../models/IncomeStream.js';
import Organization from '../models/Organization.js';
import { isCurrencyCode } from '../utils/validators.js';
import { toMajor, parseAmountMinor, parseDay, optionalText } from '../utils/financeInput.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';
const LIST_LIMIT = 5000;

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const toReceiptDto = (receipt) => ({
  id: String(receipt._id),
  streamId: String(receipt.streamId),
  receivedAt: receipt.receivedAt,
  amount: toMajor(receipt.amountMinor),
  currency: receipt.currency,
  note: receipt.note || '',
  source: receipt.source || 'manual',
  createdAt: receipt.createdAt,
});

// Streams made before receipts existed carried one amount and one date. Turn
// each into a receipt ONCE so the balance does not suddenly drop to zero after
// this update. The flag is claimed atomically so two requests cannot both run it.
const backfillOnce = async (orgId, userId) => {
  const claimed = await Organization.findOneAndUpdate(
    { _id: orgId, receiptsBackfilled: { $ne: true } },
    { $set: { receiptsBackfilled: true } },
    { new: false }
  );
  if (!claimed) return;
  const streams = await IncomeStream.find({ orgId, isArchived: false, expectedAmountMinor: { $gt: 0 } }).lean();
  if (streams.length === 0) return;
  const existing = new Set((await IncomeReceipt.distinct('streamId', { orgId })).map(String));
  const docs = streams
    .filter((stream) => !existing.has(String(stream._id)))
    .map((stream) => ({
      orgId,
      streamId: stream._id,
      receivedAt: stream.receivedAt || stream.createdAt,
      amountMinor: stream.expectedAmountMinor,
      currency: stream.currency,
      note: '',
      source: 'backfill',
      createdBy: userId,
    }));
  if (docs.length > 0) await IncomeReceipt.insertMany(docs);
};

export const listReceipts = async (req, res, next) => {
  try {
    await backfillOnce(req.user.orgId, req.user.id);
    const filter = { orgId: req.user.orgId };
    if (req.query.streamId) {
      if (!mongoose.isValidObjectId(req.query.streamId)) return fail(res, 400, GENERIC_INVALID);
      filter.streamId = req.query.streamId;
    }
    const receipts = await IncomeReceipt.find(filter).sort({ receivedAt: -1, createdAt: -1 }).limit(LIST_LIMIT).lean();
    res.json({ success: true, receipts: receipts.map(toReceiptDto), capped: receipts.length >= LIST_LIMIT });
  } catch (error) {
    next(error);
  }
};

export const createReceipt = async (req, res, next) => {
  try {
    const { streamId, receivedAt, amount, currency, note } = req.body || {};
    if (!mongoose.isValidObjectId(streamId)) return fail(res, 400, GENERIC_INVALID);
    const stream = await IncomeStream.findOne({ _id: streamId, orgId: req.user.orgId }).lean();
    if (!stream) return fail(res, 404, NOT_FOUND);

    const amountMinor = parseAmountMinor(amount);
    const day = parseDay(receivedAt);
    const cleanedNote = optionalText(note, 200);
    if (amountMinor === undefined || !day || cleanedNote === undefined) return fail(res, 400, GENERIC_INVALID);
    const resolvedCurrency = currency === undefined || currency === '' ? stream.currency : currency;
    if (!isCurrencyCode(resolvedCurrency)) return fail(res, 400, GENERIC_INVALID);

    const receipt = await IncomeReceipt.create({
      orgId: req.user.orgId,
      streamId: stream._id,
      receivedAt: day,
      amountMinor,
      currency: resolvedCurrency,
      note: cleanedNote,
      source: 'manual',
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, receipt: toReceiptDto(receipt.toObject()) });
  } catch (error) {
    next(error);
  }
};

export const updateReceipt = async (req, res, next) => {
  try {
    const receipt = await IncomeReceipt.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!receipt) return fail(res, 404, NOT_FOUND);
    const { receivedAt, amount, currency, note } = req.body || {};

    if (amount !== undefined) {
      const amountMinor = parseAmountMinor(amount);
      if (amountMinor === undefined) return fail(res, 400, GENERIC_INVALID);
      receipt.amountMinor = amountMinor;
    }
    if (receivedAt !== undefined) {
      const day = parseDay(receivedAt);
      if (!day) return fail(res, 400, GENERIC_INVALID);
      receipt.receivedAt = day;
    }
    if (currency !== undefined) {
      if (!isCurrencyCode(currency)) return fail(res, 400, GENERIC_INVALID);
      receipt.currency = currency;
    }
    if (note !== undefined) {
      const cleanedNote = optionalText(note, 200);
      if (cleanedNote === undefined) return fail(res, 400, GENERIC_INVALID);
      receipt.note = cleanedNote;
    }
    await receipt.save();
    res.json({ success: true, receipt: toReceiptDto(receipt.toObject()) });
  } catch (error) {
    if (error?.name === 'CastError') return fail(res, 404, NOT_FOUND);
    next(error);
  }
};

export const deleteReceipt = async (req, res, next) => {
  try {
    const result = await IncomeReceipt.deleteOne({ _id: req.params.id, orgId: req.user.orgId });
    if (result.deletedCount === 0) return fail(res, 404, NOT_FOUND);
    res.json({ success: true });
  } catch (error) {
    if (error?.name === 'CastError') return fail(res, 404, NOT_FOUND);
    next(error);
  }
};

// --- Opening balance ---------------------------------------------------

const toOpeningDto = (organization) => ({
  amount: toMajor(organization?.openingBalanceMinor || 0),
  currency: organization?.openingBalanceCurrency || '',
  asOf: organization?.openingBalanceAsOf ? new Date(organization.openingBalanceAsOf).toISOString().slice(0, 10) : null,
});

export const getOpeningBalance = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.user.orgId).lean();
    res.json({ success: true, opening: toOpeningDto(organization) });
  } catch (error) {
    next(error);
  }
};

// amount 0 (or empty) turns the opening balance off: the balance starts from zero.
export const setOpeningBalance = async (req, res, next) => {
  try {
    const { amount, currency, asOf } = req.body || {};
    const organization = await Organization.findById(req.user.orgId);
    if (!organization) return fail(res, 404, NOT_FOUND);

    const zero = amount === undefined || amount === null || amount === '' || Number(amount) === 0;
    if (zero) {
      organization.openingBalanceMinor = 0;
      organization.openingBalanceCurrency = '';
      organization.openingBalanceAsOf = null;
    } else {
      const minor = parseAmountMinor(amount);
      const day = parseDay(asOf);
      if (minor === undefined || !day || !isCurrencyCode(currency)) return fail(res, 400, GENERIC_INVALID);
      organization.openingBalanceMinor = minor;
      organization.openingBalanceCurrency = currency;
      organization.openingBalanceAsOf = day;
    }
    await organization.save();
    res.json({ success: true, opening: toOpeningDto(organization.toObject()) });
  } catch (error) {
    next(error);
  }
};
