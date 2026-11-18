import mongoose from 'mongoose';

// A monthly spending limit for one expense category.
const budgetSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true },
  },
  { timestamps: true }
);

budgetSchema.index({ orgId: 1, categoryId: 1 }, { unique: true });

export default mongoose.model('Budget', budgetSchema);
