import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Money the person already had when they started. 0 means "start from zero".
    // Only income received and money spent ON OR AFTER openingBalanceAsOf count
    // on top of it (null = everything counts).
    openingBalanceMinor: { type: Number, default: 0 },
    openingBalanceCurrency: { type: String, default: '' },
    openingBalanceAsOf: { type: Date, default: null },
    // Set once old income streams have been turned into receipts.
    receiptsBackfilled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);
