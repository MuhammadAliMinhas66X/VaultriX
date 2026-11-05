import mongoose from 'mongoose';
import { BILL_FREQUENCIES } from '../utils/billRecurrence.js';

export const BILL_METHODS = ['cash', 'bank', 'wallet'];
export const SERIES_STATES = ['active', 'paused'];

const paymentSchema = new mongoose.Schema(
  {
    amountMinor: { type: Number, required: true, min: 1 },
    paidAt: { type: Date, required: true },
    payMethod: { type: String, enum: [...BILL_METHODS, ''], default: '' },
    payName: { type: String, default: '' },
    note: { type: String, default: '' },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
  },
  { timestamps: true }
);

const anchorSchema = new mongoose.Schema(
  {
    seq: { type: Number, required: true },
    dueAt: { type: Date, default: null },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    nextBillAt: { type: Date, default: null },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    billerName: { type: String, required: true },
    billerId: { type: String, default: '' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    amountMinor: { type: Number, required: true, min: 1 },
    installationMinor: { type: Number, default: 0, min: 0 },
    currency: { type: String, required: true },
    dueAt: { type: Date, required: true },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    billerAccount: { type: String, default: '' },
    payMethod: { type: String, enum: [...BILL_METHODS, ''], default: '' },
    payName: { type: String, default: '' },
    note: { type: String, default: '' },
    frequency: { type: String, enum: BILL_FREQUENCIES, default: 'none' },
    seriesState: { type: String, enum: SERIES_STATES, default: 'active' },
    seriesId: { type: mongoose.Schema.Types.ObjectId, index: true },
    sequence: { type: Number, default: 1 },
    nextSeq: { type: Number, default: 2 },
    nextBillAt: { type: Date, default: null },
    anchor: { type: anchorSchema, default: null },
    generated: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    payments: { type: [paymentSchema], default: [] },
  },
  { timestamps: true, optimisticConcurrency: true }
);

billSchema.index({ orgId: 1, dueAt: 1 });
billSchema.index({ orgId: 1, seriesId: 1, sequence: 1 }, { unique: true });
billSchema.index({ orgId: 1, frequency: 1, seriesState: 1, generated: 1, nextBillAt: 1 });

export default mongoose.model('Bill', billSchema);
