import mongoose from 'mongoose';

// Money the user put aside by hand (or took back out). What is left over each month is NOT stored here:
// the app works that out from income and spending.
const savingEntrySchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Positive = put in, negative = taken out.
    amountMinor: { type: Number, required: true },
    currency: { type: String, required: true },
    date: { type: Date, required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('SavingEntry', savingEntrySchema);
