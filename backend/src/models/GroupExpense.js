import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountMinor: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const groupExpenseSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true },
    spentAt: { type: Date, required: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    splitType: { type: String, enum: ['equal', 'exact'], default: 'equal' },
    shares: { type: [shareSchema], default: [] },
  },
  { timestamps: true }
);

groupExpenseSchema.index({ groupId: 1, spentAt: -1 });

export default mongoose.model('GroupExpense', groupExpenseSchema);
