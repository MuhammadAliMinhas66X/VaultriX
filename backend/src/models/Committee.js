import mongoose from 'mongoose';

const paidSchema = new mongoose.Schema(
  {
    round: { type: Number, required: true, min: 1 },
    paidAt: { type: Date, required: true },
    amountMinor: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

// Another person in the committee. Only the organizer needs these (to tick who paid each round), but a
// member may also write down names. `slot` is the round this person takes the pot; null = not drawn yet.
const memberSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 40 },
  slot: { type: Number, min: 1, default: null },
  payments: { type: [paidSchema], default: [] },
});

const payoutSchema = new mongoose.Schema(
  {
    round: { type: Number, required: true, min: 1 },
    paidAt: { type: Date, required: true },
  },
  { _id: false }
);

// A committee (kameti / ROSCA): `size` people each put in `contributionMinor` every period, and each
// period one of them takes the whole pot. The record is the user's own view of it.
//  - role 'member': I pay the organizer and wait for my turn (`paid`, `payoutReceivedAt`).
//  - role 'organizer': I also collect from everybody (`members[].payments`) and hand the pot to that
//    round's winner (`payouts`). My own payments and my own slot still live in `paid` and `mySlot`.
const committeeSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    role: { type: String, enum: ['member', 'organizer'], default: 'member' },
    currency: { type: String, required: true },
    contributionMinor: { type: Number, required: true, min: 1 },
    size: { type: Number, required: true, min: 2, max: 60 },
    frequency: { type: String, enum: ['monthly', 'weekly'], default: 'monthly' },
    startDate: { type: Date, required: true },
    mySlot: { type: Number, min: 1, default: null },
    paid: { type: [paidSchema], default: [] },
    members: { type: [memberSchema], default: [] },
    payouts: { type: [payoutSchema], default: [] },
    payoutReceivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Committee', committeeSchema);
