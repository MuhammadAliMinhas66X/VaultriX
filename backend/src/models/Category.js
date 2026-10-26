import mongoose from 'mongoose';

// Not wired into any UI yet (that's the Transactions phase) - created now
// so the model and a seeded default set already exist the moment
// Transactions needs somewhere for an expense/income to point at.
const CATEGORY_TYPES = ['income', 'expense'];

const categorySchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: CATEGORY_TYPES, required: true },
    color: { type: String, default: '#111114' },
    isArchived: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false }, // seeded, not user-created - still editable/archivable
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

categorySchema.index({ orgId: 1, type: 1, isArchived: 1 });

export const CATEGORY_TYPE_VALUES = CATEGORY_TYPES;
export default mongoose.model('Category', categorySchema);
