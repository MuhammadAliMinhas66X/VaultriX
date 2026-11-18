import mongoose from 'mongoose';

const contributionSchema = new mongoose.Schema(
  {
    // Positive = money put in, negative = money taken out.
    amountMinor: { type: Number, required: true },
    date: { type: Date, required: true },
    note: { type: String, default: '' },
  },
  { _id: true }
);

// A savings goal: a target amount, an optional deadline and what has been put aside so far.
const goalSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    targetMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true },
    deadline: { type: Date, default: null },
    contributions: { type: [contributionSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Goal', goalSchema);
