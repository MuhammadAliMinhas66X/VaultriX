import mongoose from 'mongoose';

export const LOAN_DIRECTIONS = ['borrowed', 'lent'];
export const LOAN_METHODS = ['cash', 'bank', 'wallet'];

const proofSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true },
    version: { type: Number, default: 0 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    amountMinor: { type: Number, required: true, min: 1 },
    paidAt: { type: Date, required: true },
    note: { type: String, default: '' },
    proof: { type: proofSchema, default: null },
  },
  { timestamps: true }
);

const loanSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    direction: { type: String, enum: LOAN_DIRECTIONS, required: true },
    personName: { type: String, required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    scale: { type: Number, default: 100 },
    currency: { type: String, required: true },
    sentAt: { type: Date, required: true },
    dueAt: { type: Date, default: null },
    note: { type: String, default: '' },
    receivedMethod: { type: String, enum: [...LOAN_METHODS, ''], default: '' },
    receivedName: { type: String, default: '' },
    receivedProof: { type: proofSchema, default: null },
    payoutName: { type: String, default: '' },
    payoutMethod: { type: String, enum: [...LOAN_METHODS, ''], default: '' },
    payoutInstitution: { type: String, default: '' },
    payoutNumber: { type: String, default: '' },
    payments: { type: [paymentSchema], default: [] },
    source: { type: String, enum: ['manual', 'expense'], default: 'manual' },
  },
  { timestamps: true, optimisticConcurrency: true }
);

loanSchema.index({ orgId: 1, direction: 1, sentAt: -1 });

export default mongoose.model('Loan', loanSchema);
