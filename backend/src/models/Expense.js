import mongoose from 'mongoose';

export const EXPENSE_METHODS = ['cash', 'bank', 'wallet'];

const expenseSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    spentAt: { type: Date, required: true },
    note: { type: String, default: '' },
    payMethod: { type: String, enum: [...EXPENSE_METHODS, ''], default: '' },
    payName: { type: String, default: '' },
  },
  { timestamps: true }
);

expenseSchema.index({ orgId: 1, spentAt: -1 });

export default mongoose.model('Expense', expenseSchema);
