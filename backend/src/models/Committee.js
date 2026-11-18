import mongoose from 'mongoose';

const paidSchema = new mongoose.Schema(
  {
    round: { type: Number, required: true, min: 1 },
    paidAt: { type: Date, required: true },
    amountMinor: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

// A committee (kameti / ROSCA): `size` people each put in `contributionMinor` every period, and each
// period one of them takes the whole pot. This record is the user's own view: which round is theirs,
// which of their payments are made, and whether their payout arrived.
const committeeSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    currency: { type: String, required: true },
    contributionMinor: { type: Number, required: true, min: 1 },
    size: { type: Number, required: true, min: 2, max: 60 },
    frequency: { type: String, enum: ['monthly', 'weekly'], default: 'monthly' },
    startDate: { type: Date, required: true },
    mySlot: { type: Number, required: true, min: 1 },
    paid: { type: [paidSchema], default: [] },
    payoutReceivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Committee', committeeSchema);
