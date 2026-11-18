import mongoose from 'mongoose';

export const EXPENSE_METHODS = ['cash', 'bank', 'wallet'];
export const EXPENSE_REPEATS = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

const expenseSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    spentAt: { type: Date, required: true },
    note: { type: String, default: '' },
    // Photo of the paper receipt (private image storage, same as loan proofs).
    receipt: {
      type: new mongoose.Schema({ publicId: String, version: Number }, { _id: false }),
      default: null,
    },
    payMethod: { type: String, enum: [...EXPENSE_METHODS, ''], default: '' },
    payName: { type: String, default: '' },
    paidBy: { type: String, enum: ['self', 'other'], default: 'self' },
    payerName: { type: String, default: '' },
    givenTo: { type: String, default: '' },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
    billPaymentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', default: null },
    // Repeating expense. The expense the person typed is the "head": it keeps
    // `repeatFrequency`, and the server makes a copy (`repeatOf` = head id) each
    // time the next date arrives. Copies never repeat on their own.
    // My share of a group cost that I copied into my own expenses (stops doing it twice).
    groupExpenseId: { type: mongoose.Schema.Types.ObjectId, default: null },
    repeatFrequency: { type: String, enum: EXPENSE_REPEATS, default: 'none' },
    repeatAnchor: { type: Date, default: null },
    repeatStep: { type: Number, default: 1 },
    repeatOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
    repeatKey: { type: String, default: '' },
  },
  { timestamps: true }
);

expenseSchema.index({ orgId: 1, spentAt: -1 });
expenseSchema.index({ billPaymentId: 1 }, { unique: true, partialFilterExpression: { billPaymentId: { $type: 'objectId' } } });
expenseSchema.index({ billId: 1 });
expenseSchema.index({ orgId: 1, groupExpenseId: 1 }, { unique: true, partialFilterExpression: { groupExpenseId: { $type: 'objectId' } } });
expenseSchema.index({ orgId: 1, repeatFrequency: 1 });
expenseSchema.index({ repeatOf: 1, repeatKey: 1 }, { unique: true, partialFilterExpression: { repeatOf: { $type: 'objectId' } } });

export default mongoose.model('Expense', expenseSchema);
