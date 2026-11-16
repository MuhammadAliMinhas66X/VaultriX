import mongoose from 'mongoose';

// "Sara paid Ali 1500": clears part of what Sara owes in the group.
const groupSettlementSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true },
    paidAt: { type: Date, required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

groupSettlementSchema.index({ groupId: 1, paidAt: -1 });

export default mongoose.model('GroupSettlement', groupSettlementSchema);
