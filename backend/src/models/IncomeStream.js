import mongoose from 'mongoose';

// Where money comes FROM, as distinct from an Account (where it lands).
// Redesigned per feedback: income types are kept to the short list that
// actually matters (Salaried, Business, Freelance, Other - savings is its
// own module, not an income type), plus a free-text "detail" field so
// "Business" can mean a physical shop, a freelance contract, or anything
// else without needing a new enum value for every variant. destination*
// records which bank, digital wallet, or "cash" the income actually lands
// in - purely informational for now (no live balance syncing), but it's
// the honest shape for the "remaining after this month" feature later.
const INCOME_TYPES = ['salaried', 'business', 'freelance', 'other'];
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'variable'];
const DESTINATION_METHODS = ['cash', 'bank', 'wallet'];

const incomeStreamSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    incomeType: { type: String, enum: INCOME_TYPES, default: 'salaried' },
    // Free-text specifics - "Physical retail store", "Web design
    // freelancing", "Rental income", whatever the person wants to call
    // it. Optional everywhere, not just for "other".
    typeDetail: { type: String, default: '' },
    frequency: { type: String, enum: FREQUENCIES, default: 'monthly' },
    // Where this income is actually received. "cash" needs nothing else;
    // "bank"/"wallet" pair with destinationName (a bank or digital wallet
    // name - from the frontend's known list, or anything else the person
    // types in, so this is deliberately NOT an enum here).
    destinationMethod: { type: String, enum: DESTINATION_METHODS, default: 'bank' },
    destinationName: { type: String, default: '' },
    // Optional - what this stream is expected to bring in per occurrence.
    // Minor units (cents), same convention as Account.balanceMinor.
    expectedAmountMinor: { type: Number, default: null },
    currency: { type: String, required: true },
    isArchived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

incomeStreamSchema.index({ orgId: 1, isArchived: 1, createdAt: 1 });

export const INCOME_TYPE_VALUES = INCOME_TYPES;
export const FREQUENCY_VALUES = FREQUENCIES;
export const DESTINATION_METHOD_VALUES = DESTINATION_METHODS;
export default mongoose.model('IncomeStream', incomeStreamSchema);
