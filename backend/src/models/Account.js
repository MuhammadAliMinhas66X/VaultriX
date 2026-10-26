import mongoose from 'mongoose';

// What the user calls a "money stream" - a bank account, cash, a card, a
// pot of savings, whatever they want a running balance for. The SUM of
// every account's balance (grouped by currency - see accountController's
// getBalancesSummary) is the "central point of gravity" the Dashboard is
// built around: everything else (transactions, budgets, down the line)
// moves money into or out of one of these.
const ACCOUNT_TYPES = ['checking', 'savings', 'cash', 'credit_card', 'investment', 'other'];

const accountSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ACCOUNT_TYPES, default: 'checking' },
    currency: { type: String, required: true },
    // Minor units (cents) - avoids float rounding drift once real
    // transactions start adjusting this on every add/edit/delete. The
    // API converts to/from a plain decimal number at the boundary so
    // nothing outside this model ever has to think in cents.
    balanceMinor: { type: Number, default: 0 },
    color: { type: String, default: '#111114' },
    isArchived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

accountSchema.index({ orgId: 1, isArchived: 1, createdAt: 1 });

export const ACCOUNT_TYPE_VALUES = ACCOUNT_TYPES;
export default mongoose.model('Account', accountSchema);
