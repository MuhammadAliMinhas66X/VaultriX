import mongoose from 'mongoose';

// One pending row per user mid-way through changing their email. The code
// is sent to the NEW address to prove the user actually owns it before the
// account's email is updated.
const pendingEmailChangeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    newEmail: { type: String, required: true, lowercase: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    sendCount: { type: Number, default: 1 },
    windowStartedAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

pendingEmailChangeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PendingEmailChange', pendingEmailChangeSchema);
