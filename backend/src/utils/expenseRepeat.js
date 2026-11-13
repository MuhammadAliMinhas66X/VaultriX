import Expense from '../models/Expense.js';
import { addSteps } from './billRecurrence.js';

const MAX_PER_HEAD = 400;
const dayOf = (date) => new Date(date).toISOString().slice(0, 10);

export const nextRepeatDate = (head) => addSteps(head.repeatAnchor || head.spentAt, head.repeatFrequency, head.repeatStep || 1);

// Makes the copies of repeating expenses that are due up to `now` (inclusive).
// Safe to call on every list: a copy is claimed by moving `repeatStep` forward
// first, and a unique index on (repeatOf, repeatKey) stops duplicates.
export const generateRepeats = async (orgId, now = new Date()) => {
  const today = new Date(`${dayOf(now)}T00:00:00.000Z`);
  const heads = await Expense.find({ orgId, repeatFrequency: { $ne: 'none' } });
  let made = 0;
  for (const head of heads) {
    for (let guard = 0; guard < MAX_PER_HEAD; guard += 1) {
      const due = nextRepeatDate(head);
      if (!due || due > today) break;
      const step = head.repeatStep || 1;
      const claimed = await Expense.updateOne({ _id: head._id, repeatStep: step }, { $inc: { repeatStep: 1 } });
      if (claimed.modifiedCount === 0) break;
      head.repeatStep = step + 1;
      try {
        await Expense.create({
          orgId,
          createdBy: head.createdBy,
          amountMinor: head.amountMinor,
          currency: head.currency,
          categoryId: head.categoryId,
          spentAt: due,
          note: head.note,
          payMethod: head.payMethod,
          payName: head.payName,
          paidBy: 'self',
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
