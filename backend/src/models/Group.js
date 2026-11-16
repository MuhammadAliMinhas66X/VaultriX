import mongoose from 'mongoose';

// A shared group (flatmates, a trip). People keep their own private workspace;
// a group only holds the costs they decided to share with each other.
const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, default: '' },
    joinedAt: { type: Date, default: Date.now },
    left: { type: Boolean, default: false },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    currency: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true }
);

groupSchema.index({ 'members.userId': 1 });

export default mongoose.model('Group', groupSchema);
