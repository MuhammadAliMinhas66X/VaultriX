import Group from '../models/Group.js';
import GroupExpense from '../models/GroupExpense.js';
import GroupSettlement from '../models/GroupSettlement.js';
import GroupInvite from '../models/GroupInvite.js';

export const deleteGroupCompletely = async (groupId) => {
  await Promise.all([GroupExpense.deleteMany({ groupId }), GroupSettlement.deleteMany({ groupId }), GroupInvite.deleteMany({ groupId })]);
  await Group.deleteOne({ _id: groupId });
};

// When an account is deleted it leaves every group (balances stay, under the old name).
export const leaveGroupsOnDelete = async (userId) => {
  const groups = await Group.find({ 'members.userId': userId });
  for (const group of groups) {
    group.members.forEach((member) => {
      if (String(member.userId) === String(userId)) member.left = true;
    });
    const active = group.members.filter((member) => !member.left);
    if (active.length === 0) {
      await deleteGroupCompletely(group._id);
    } else {
      if (String(group.createdBy) === String(userId)) group.createdBy = active[0].userId;
      await group.save();
    }
  }
};
