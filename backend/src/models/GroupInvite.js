import mongoose from 'mongoose';

const groupInviteSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, required: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

groupInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('GroupInvite', groupInviteSchema);
