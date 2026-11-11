import mongoose from 'mongoose';

// One real payment that came in (a salary on 1 Nov, a freelance invoice paid on
// 14 Nov). An IncomeStream says where money comes from; a receipt says that
// money actually arrived. The balance is built from receipts, not from the
// stream's single "expected amount".
// amountMinor is the GROSS amount in cents (scale 100). Deductions that the
// stream is set to take off are applied on the client, same as before.
const incomeReceiptSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    streamId: { type: mongoose.Schema.Types.ObjectId, ref: 'IncomeStream', required: true },
    receivedAt: { type: Date, required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true },
    note: { type: String, default: '' },
    // 'backfill' marks receipts made from old streams when this feature first ran.
    source: { type: String, enum: ['manual', 'stream', 'backfill'], default: 'manual' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

incomeReceiptSchema.index({ orgId: 1, receivedAt: -1 });
incomeReceiptSchema.index({ orgId: 1, streamId: 1, receivedAt: -1 });

export default mongoose.model('IncomeReceipt', incomeReceiptSchema);
