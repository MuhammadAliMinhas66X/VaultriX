import Group from '../models/Group.js';
import GroupExpense from '../models/GroupExpense.js';
import { addSteps } from './billRecurrence.js';

export const GROUP_REPEATS = ['none', 'weekly', 'monthly', 'yearly'];
const MAX_PER_HEAD = 200;
const dayOf = (date) => new Date(date).toISOString().slice(0, 10);

export const nextGroupRepeatDate = (head) => addSteps(head.repeatAnchor || head.spentAt, head.repeatFrequency, head.repeatStep || 1);

// Makes the copies of repeating shared costs (monthly rent...) that are due up to `now`.
// Safe to call on every group view: a copy is claimed by moving `repeatStep` forward
// first and a unique index on (repeatOf, repeatKey) stops duplicates. If the payer or
// anyone sharing the cost has left the group, the repeat is switched off instead of
// charging someone who is gone.
export const generateGroupRepeats = async (groupId, now = new Date()) => {
  const group = await Group.findById(groupId).select('members').lean();
  if (!group) return 0;
  const active = new Set(group.members.filter((member) => !member.left).map((member) => String(member.userId)));
  const today = new Date(`${dayOf(now)}T00:00:00.000Z`);
  const heads = await GroupExpense.find({ groupId, repeatFrequency: { $ne: 'none' } });
  let made = 0;
  for (const head of heads) {
    const everyoneHere = active.has(String(head.paidBy)) && head.shares.every((share) => active.has(String(share.userId)));
    if (!everyoneHere) {
      await GroupExpense.updateOne({ _id: head._id }, { $set: { repeatFrequency: 'none' } });
      continue;
    }
    for (let guard = 0; guard < MAX_PER_HEAD; guard += 1) {
      const due = nextGroupRepeatDate(head);
      if (!due || due > today) break;
      const step = head.repeatStep || 1;
      const claimed = await GroupExpense.updateOne({ _id: head._id, repeatStep: step }, { $inc: { repeatStep: 1 } });
      if (claimed.modifiedCount === 0) break;
      head.repeatStep = step + 1;
      try {
        await GroupExpense.create({
          groupId,
          createdBy: head.createdBy,
          description: head.description,
          amountMinor: head.amountMinor,
          currency: head.currency,
          spentAt: due,
          paidBy: head.paidBy,
          splitType: head.splitType,
          shares: head.shares.map((share) => ({ userId: share.userId, amountMinor: share.amountMinor, percentBp: share.percentBp })),
          repeatOf: head._id,
          repeatKey: dayOf(due),
        });
        made += 1;
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
    }
  }
  return made;
};
