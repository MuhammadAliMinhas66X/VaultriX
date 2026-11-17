import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    percentBp: { type: Number, min: 0, max: 10000 },
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
    splitType: { type: String, enum: ['equal', 'exact', 'percent'], default: 'equal' },
    shares: { type: [shareSchema], default: [] },
    // Repeating cost (monthly rent). The cost the person typed is the "head"; the server
    // makes a copy (`repeatOf` = head id) each time the next date arrives. Copies never repeat.
    repeatFrequency: { type: String, enum: ['none', 'weekly', 'monthly', 'yearly'], default: 'none' },
    repeatAnchor: { type: Date, default: null },
    repeatStep: { type: Number, default: 1 },
    repeatOf: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupExpense', default: null },
    repeatKey: { type: String, default: '' },
  },
  { timestamps: true }
);

groupExpenseSchema.index({ groupId: 1, spentAt: -1 });
groupExpenseSchema.index({ groupId: 1, repeatFrequency: 1 });
groupExpenseSchema.index({ repeatOf: 1, repeatKey: 1 }, { unique: true, partialFilterExpression: { repeatOf: { $type: 'objectId' } } });

export default mongoose.model('GroupExpense', groupExpenseSchema);
