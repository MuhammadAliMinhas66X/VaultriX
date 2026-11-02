import Loan, { LOAN_DIRECTIONS, LOAN_METHODS } from '../models/Loan.js';
import Expense from '../models/Expense.js';
import { cleanLabel, cleanFreeText, isCurrencyCode } from '../utils/validators.js';
import { isImageStorageReady } from '../config/cloudinary.js';
import { toMajor, parseAmountMinor, parseDay, parseWhere, optionalText } from '../utils/financeInput.js';
import {
  uploadPrivateImage,
  privateImageUrls,
  destroyImage,
  loanReceivedPublicId,
  loanPaymentPublicId,
} from '../services/imageStorage.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';
const OVERPAY = 'That is more than what is left to pay.';
const UPLOAD_UNAVAILABLE = 'Photo upload is not available right now.';
const UPLOAD_FAILED = 'Could not upload that photo. Please try again.';
const NO_IMAGE = 'Choose an image to upload.';

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const parsePayout = (body) => {
  const where = parseWhere(body.payoutMethod, body.payoutInstitution);
  if (!where) return undefined;
  if (!where.method) return { payoutName: '', payoutMethod: '', payoutInstitution: '', payoutNumber: '' };

  const holder = cleanFreeText(typeof body.payoutName === 'string' ? body.payoutName : '', 80);
  if (!holder) return undefined;

  let number = cleanFreeText(typeof body.payoutNumber === 'string' ? body.payoutNumber : '', 40);
  if (number === null) return undefined;
  if (where.method === 'cash') {
    number = number || '-';
  } else if (!number) {
    return undefined;
  }

  return { payoutName: holder, payoutMethod: where.method, payoutInstitution: where.name, payoutNumber: number };
};

const paidMinorOf = (loan) => (loan.payments || []).reduce((sum, item) => sum + item.amountMinor, 0);

const proofDto = (proof) => (isImageStorageReady() ? privateImageUrls(proof) : null);

const toLoanDto = (loan) => {
  const paidMinor = paidMinorOf(loan);
  const remainingMinor = Math.max(0, loan.amountMinor - paidMinor);
  return {
    id: String(loan._id),
    direction: loan.direction,
    personName: loan.personName,
    amount: toMajor(loan.amountMinor),
    currency: loan.currency,
    sentAt: loan.sentAt,
    dueAt: loan.dueAt || null,
    note: loan.note || '',
    receivedMethod: loan.receivedMethod || '',
    receivedName: loan.receivedName || '',
    receivedProof: proofDto(loan.receivedProof),
    payoutName: loan.payoutName || '',
    payoutMethod: loan.payoutMethod || '',
    payoutInstitution: loan.payoutInstitution || '',
    fromExpense: loan.source === 'expense',
    payoutNumber: loan.payoutNumber || '',
    paid: toMajor(paidMinor),
    remaining: toMajor(remainingMinor),
    done: remainingMinor === 0,
    payments: (loan.payments || [])
      .slice()
      .sort((a, b) => new Date(a.paidAt) - new Date(b.paidAt) || new Date(a.createdAt) - new Date(b.createdAt))
      .map((item) => ({
        id: String(item._id),
        amount: toMajor(item.amountMinor),
        paidAt: item.paidAt,
        note: item.note || '',
        proof: proofDto(item.proof),
      })),
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
  };
};

const sendLoan = (res, loan, status = 200) => res.status(status).json({ success: true, loan: toLoanDto(loan.toObject ? loan.toObject() : loan) });

const handleError = (res, next, error) => {
  if (error?.name === 'CastError' || error?.name === 'VersionError') return fail(res, 404, NOT_FOUND);
  return next(error);
};

const findLoan = (req) => Loan.findOne({ _id: req.params.id, orgId: req.user.orgId });

const cleanupImages = async (loan) => {
  const ids = [];
  if (loan.receivedProof?.publicId) ids.push(loan.receivedProof.publicId);
  (loan.payments || []).forEach((item) => {
    if (item.proof?.publicId) ids.push(item.proof.publicId);
  });
  if (!ids.length || !isImageStorageReady()) return;
  await Promise.all(ids.map((id) => destroyImage(id)));
};

export const listLoans = async (req, res, next) => {
  try {
    const loans = await Loan.find({ orgId: req.user.orgId }).sort({ sentAt: -1, createdAt: -1 }).lean();
    res.json({ success: true, loans: loans.map(toLoanDto) });
  } catch (error) {
    next(error);
  }
};

export const createLoan = async (req, res, next) => {
  try {
    const body = req.body || {};

    if (!LOAN_DIRECTIONS.includes(body.direction)) return fail(res, 400, GENERIC_INVALID);

    const personName = cleanLabel(body.personName);
    if (!personName) return fail(res, 400, GENERIC_INVALID);

    const amountMinor = parseAmountMinor(body.amount);
    if (amountMinor === undefined) return fail(res, 400, GENERIC_INVALID);

    if (!isCurrencyCode(body.currency)) return fail(res, 400, GENERIC_INVALID);

    const sentAt = parseDay(body.sentAt);
    if (!sentAt) return fail(res, 400, GENERIC_INVALID);

    let dueAt = null;
    if (body.dueAt !== undefined && body.dueAt !== null && body.dueAt !== '') {
      dueAt = parseDay(body.dueAt, { maxFutureDays: 36500 });
      if (!dueAt || dueAt < sentAt) return fail(res, 400, GENERIC_INVALID);
    }

    const note = optionalText(body.note, 500);
    if (note === undefined) return fail(res, 400, GENERIC_INVALID);

    const received = parseWhere(body.receivedMethod, body.receivedName);
    if (!received) return fail(res, 400, GENERIC_INVALID);

    const payout = parsePayout(body);
    if (!payout) return fail(res, 400, GENERIC_INVALID);

    const loan = await Loan.create({
      orgId: req.user.orgId,
      createdBy: req.user.id,
      direction: body.direction,
      personName,
      amountMinor,
      currency: body.currency,
      sentAt,
      dueAt,
      note,
      receivedMethod: received.method,
      receivedName: received.name,
      ...payout,
    });

    sendLoan(res, loan, 201);
  } catch (error) {
    handleError(res, next, error);
  }
};

export const updateLoan = async (req, res, next) => {
  try {
    const loan = await findLoan(req);
    if (!loan) return fail(res, 404, NOT_FOUND);

    const body = req.body || {};
    const update = {};

    if (body.direction !== undefined) {
      if (!LOAN_DIRECTIONS.includes(body.direction)) return fail(res, 400, GENERIC_INVALID);
      update.direction = body.direction;
    }

    if (body.personName !== undefined) {
      const personName = cleanLabel(body.personName);
      if (!personName) return fail(res, 400, GENERIC_INVALID);
      update.personName = personName;
    }

    if (body.amount !== undefined) {
      const amountMinor = parseAmountMinor(body.amount);
      if (amountMinor === undefined || amountMinor < paidMinorOf(loan)) return fail(res, 400, GENERIC_INVALID);
      update.amountMinor = amountMinor;
    }

    if (body.currency !== undefined) {
      if (!isCurrencyCode(body.currency)) return fail(res, 400, GENERIC_INVALID);
      update.currency = body.currency;
    }

    let nextSentAt = loan.sentAt;
    if (body.sentAt !== undefined) {
      const sentAt = parseDay(body.sentAt);
      if (!sentAt) return fail(res, 400, GENERIC_INVALID);
      if (loan.payments.some((item) => item.paidAt < sentAt)) return fail(res, 400, GENERIC_INVALID);
      update.sentAt = sentAt;
      nextSentAt = sentAt;
    }

    let nextDueAt = loan.dueAt;
    if (body.dueAt !== undefined) {
      if (body.dueAt === null || body.dueAt === '') {
        nextDueAt = null;
      } else {
        nextDueAt = parseDay(body.dueAt, { maxFutureDays: 36500 });
        if (!nextDueAt) return fail(res, 400, GENERIC_INVALID);
      }
      update.dueAt = nextDueAt;
    }
    if (nextDueAt && nextDueAt < nextSentAt) return fail(res, 400, GENERIC_INVALID);

    if (body.note !== undefined) {
      const note = optionalText(body.note, 500);
      if (note === undefined) return fail(res, 400, GENERIC_INVALID);
      update.note = note;
    }

    if (body.receivedMethod !== undefined) {
      const received = parseWhere(body.receivedMethod, body.receivedName);
      if (!received) return fail(res, 400, GENERIC_INVALID);
      update.receivedMethod = received.method;
      update.receivedName = received.name;
    }

    if (body.payoutMethod !== undefined) {
      const payout = parsePayout(body);
      if (!payout) return fail(res, 400, GENERIC_INVALID);
      Object.assign(update, payout);
    }

    Object.assign(loan, update);
    await loan.save();

    sendLoan(res, loan);
  } catch (error) {
    handleError(res, next, error);
  }
};

export const deleteLoan = async (req, res, next) => {
  try {
    const loan = await findLoan(req);
    if (!loan) return fail(res, 404, NOT_FOUND);

    await cleanupImages(loan);
    await Loan.deleteOne({ _id: loan._id });
    await Expense.updateMany({ orgId: req.user.orgId, loanId: loan._id }, { $set: { loanId: null } });

    res.json({ success: true });
  } catch (error) {
    handleError(res, next, error);
  }
};

export const addPayment = async (req, res, next) => {
  try {
    const loan = await findLoan(req);
    if (!loan) return fail(res, 404, NOT_FOUND);

    const body = req.body || {};

    const amountMinor = parseAmountMinor(body.amount);
    if (amountMinor === undefined) return fail(res, 400, GENERIC_INVALID);
    if (amountMinor > loan.amountMinor - paidMinorOf(loan)) return fail(res, 400, OVERPAY);

    const paidAt = parseDay(body.paidAt);
    if (!paidAt || paidAt < loan.sentAt) return fail(res, 400, GENERIC_INVALID);

    const note = optionalText(body.note, 200);
    if (note === undefined) return fail(res, 400, GENERIC_INVALID);

    loan.payments.push({ amountMinor, paidAt, note });
    await loan.save();

    const created = loan.payments[loan.payments.length - 1];
    res.status(201).json({ success: true, paymentId: String(created._id), loan: toLoanDto(loan.toObject()) });
  } catch (error) {
    handleError(res, next, error);
  }
};

export const deletePayment = async (req, res, next) => {
  try {
    const loan = await findLoan(req);
    if (!loan) return fail(res, 404, NOT_FOUND);

    const payment = loan.payments.id(req.params.paymentId);
    if (!payment) return fail(res, 404, NOT_FOUND);

    const proofId = payment.proof?.publicId;
    payment.deleteOne();
    await loan.save();

    if (proofId && isImageStorageReady()) await destroyImage(proofId);

    sendLoan(res, loan);
  } catch (error) {
    handleError(res, next, error);
  }
};

const requireUpload = (req, res) => {
  if (!req.file || !req.file.buffer) {
    fail(res, 400, NO_IMAGE);
    return false;
  }
  if (!isImageStorageReady()) {
    fail(res, 503, UPLOAD_UNAVAILABLE);
    return false;
  }
  return true;
};

const sendImage = async (req, res, publicId) => {
  try {
    return await uploadPrivateImage(req.file.buffer, publicId);
  } catch (error) {
    console.error('Photo upload failed:', error.message);
    fail(res, 502, UPLOAD_FAILED);
    return null;
  }
};

export const setReceivedProof = async (req, res, next) => {
  try {
    const loan = await findLoan(req);
    if (!loan) return fail(res, 404, NOT_FOUND);
    if (!requireUpload(req, res)) return;

    const stored = await sendImage(req, res, loanReceivedPublicId(req.user.orgId, loan._id));
    if (!stored) return;

    loan.receivedProof = { publicId: stored.publicId, version: stored.version };
    await loan.save();

    sendLoan(res, loan);
  } catch (error) {
    handleError(res, next, error);
  }
};

export const removeReceivedProof = async (req, res, next) => {
  try {
    const loan = await findLoan(req);
    if (!loan) return fail(res, 404, NOT_FOUND);

    const proofId = loan.receivedProof?.publicId;
    loan.receivedProof = null;
    await loan.save();

    if (proofId && isImageStorageReady()) await destroyImage(proofId);

    sendLoan(res, loan);
  } catch (error) {
    handleError(res, next, error);
  }
};

export const setPaymentProof = async (req, res, next) => {
  try {
    const loan = await findLoan(req);
    if (!loan) return fail(res, 404, NOT_FOUND);

    const payment = loan.payments.id(req.params.paymentId);
    if (!payment) return fail(res, 404, NOT_FOUND);
    if (!requireUpload(req, res)) return;

    const stored = await sendImage(req, res, loanPaymentPublicId(req.user.orgId, loan._id, payment._id));
    if (!stored) return;

    payment.proof = { publicId: stored.publicId, version: stored.version };
    await loan.save();

    sendLoan(res, loan);
  } catch (error) {
    handleError(res, next, error);
  }
};

export const removePaymentProof = async (req, res, next) => {
  try {
    const loan = await findLoan(req);
    if (!loan) return fail(res, 404, NOT_FOUND);

    const payment = loan.payments.id(req.params.paymentId);
    if (!payment) return fail(res, 404, NOT_FOUND);

    const proofId = payment.proof?.publicId;
    payment.proof = null;
    await loan.save();

    if (proofId && isImageStorageReady()) await destroyImage(proofId);

    sendLoan(res, loan);
  } catch (error) {
    handleError(res, next, error);
  }
};
