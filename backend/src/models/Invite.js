import mongoose from 'mongoose';

// One invitation to join a workspace. The code is only stored as a hash; the
// person who creates the invite sees it once (and it is emailed to the invitee).
const inviteSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'member', 'viewer'], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
inviteSchema.index({ orgId: 1, email: 1 });

export default mongoose.model('Invite', inviteSchema);
