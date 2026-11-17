import mongoose from 'mongoose';

const lineSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    // Optional: real expenses in this category count as "spent" on this line.
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  },
  { _id: true }
);

// One plan per workspace and month: where the salary is meant to go.
const salaryPlanSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    month: { type: String, required: true },
    streamId: { type: mongoose.Schema.Types.ObjectId, ref: 'IncomeStream', default: null },
    lines: { type: [lineSchema], default: [] },
  },
  { timestamps: true }
);

salaryPlanSchema.index({ orgId: 1, month: 1 }, { unique: true });

export default mongoose.model('SalaryPlan', salaryPlanSchema);
