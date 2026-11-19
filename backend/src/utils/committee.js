// Dates and status of a committee. Everything works on whole days (UTC) so a round never moves
// because of a time zone.
export const FREQUENCIES = ['monthly', 'weekly', 'daily'];
export const ROLES = ['member', 'organizer'];

const dayString = (date) => date.toISOString().slice(0, 10);

// The due day of round `round` (1 = the start date). Monthly keeps the day of month and uses the
// last day of shorter months (the 31st becomes the 28th, 29th or 30th), without drifting.
export const roundDay = (startDate, frequency, round) => {
  const start = new Date(startDate);
  const steps = round - 1;
  if (frequency === 'daily') return dayString(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + steps)));
  if (frequency === 'weekly') return dayString(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + steps * 7)));
  const monthIndex = start.getUTCMonth() + steps;
  const year = start.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return dayString(new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay))));
};

const statusOf = (due, today, paid) => (paid ? 'paid' : due < today ? 'overdue' : due === today ? 'due' : 'upcoming');
const idOf = (member) => String(member._id);

// today: 'YYYY-MM-DD' from the user's own clock.
export const committeeSummary = (committee, today) => {
  const members = committee.members || [];
  const payouts = new Map((committee.payouts || []).map((item) => [item.round, item]));
  const paidByRound = new Map(committee.paid.map((item) => [item.round, item]));
  const organizer = committee.role === 'organizer';
  const rounds = [];

  for (let round = 1; round <= committee.size; round += 1) {
    const due = roundDay(committee.startDate, committee.frequency, round);
    const entry = paidByRound.get(round);
    const holder = committee.mySlot === round ? { type: 'me', id: null, name: null } : null;
    const other = holder ? null : members.find((member) => member.slot === round);
    const winner = holder || (other ? { type: 'member', id: idOf(other), name: other.name } : null);
    const memberPaid = members.filter((member) => member.payments.some((item) => item.round === round));
    const collected = memberPaid.length + (entry ? 1 : 0);
    const payout = payouts.get(round);
    rounds.push({
      round,
      due,
      status: statusOf(due, today, Boolean(entry)),
      paidAt: entry ? dayString(new Date(entry.paidAt)) : null,
      mine: committee.mySlot === round,
      winner,
      collected,
      collectedMinor: collected * committee.contributionMinor,
      complete: collected === committee.size,
      paidOutAt: payout ? dayString(new Date(payout.paidAt)) : null,
    });
  }

  const memberRows = members.map((member) => {
    const paidSet = new Set(member.payments.map((item) => item.round));
    const late = rounds.filter((item) => item.due < today && !paidSet.has(item.round)).map((item) => item.round);
    return {
      id: idOf(member),
      name: member.name,
      email: member.email || '',
      userId: member.userId || null,
      slot: member.slot ?? null,
      paidRounds: [...paidSet].sort((a, b) => a - b),
      lateRounds: late,
      paidMinor: member.payments.reduce((sum, item) => sum + item.amountMinor, 0),
    };
  });

  const paidMinor = committee.paid.reduce((sum, item) => sum + item.amountMinor, 0);
  const totalMinor = committee.contributionMinor * committee.size;
  const next = rounds.find((item) => item.status !== 'paid') || null;
  const hasTurn = Number.isInteger(committee.mySlot);
  const payoutDay = hasTurn ? rounds[committee.mySlot - 1].due : null;
  const received = Boolean(committee.payoutReceivedAt);
  const payoutStatus = !hasTurn ? 'undrawn' : received ? 'received' : payoutDay <= today ? 'ready' : 'upcoming';

  // Organizer only: what members still owe for rounds already due, and pots that can be handed over.
  const owedMinor = organizer ? memberRows.reduce((sum, row) => sum + row.lateRounds.length * committee.contributionMinor, 0) : 0;
  const lateMembers = organizer ? memberRows.filter((row) => row.lateRounds.length > 0).length : 0;
  const potsToHandOver = organizer ? rounds.filter((item) => item.due <= today && item.winner && item.winner.type === 'member' && !item.paidOutAt).length : 0;
  const missingNames = Math.max(0, committee.size - 1 - members.length);

  const myDone = committee.paid.length === committee.size && (!hasTurn || received);
  const organizerDone = !organizer || rounds.every((item) => item.complete && (item.winner ? (item.winner.type === 'me' ? true : Boolean(item.paidOutAt)) : false));

  return {
    rounds,
    members: memberRows,
    paidCount: committee.paid.length,
    paidMinor,
    totalMinor,
    next,
    overdueCount: rounds.filter((item) => item.status === 'overdue').length,
    payoutMinor: totalMinor,
    payoutDay,
    payoutStatus,
    endDay: rounds[rounds.length - 1].due,
    owedMinor,
    lateMembers,
    potsToHandOver,
    missingNames,
    finished: myDone && organizerDone,
  };
};

// Gives round `round` to `holder` ('me' | member id | null). One person has one turn and one round has
// one winner, so whoever held the round, or the holder's old round, is cleared first. Pure: returns the
// new { mySlot, slots: Map(memberId -> slot) } or null when the member is unknown.
export const assignWinner = (committee, round, holder) => {
  const members = committee.members || [];
  const slots = new Map(members.map((member) => [idOf(member), member.slot ?? null]));
  let mySlot = committee.mySlot ?? null;
  if (mySlot === round) mySlot = null;
  slots.forEach((value, key) => {
    if (value === round) slots.set(key, null);
  });
  if (holder === 'me') mySlot = round;
  else if (holder) {
    if (!slots.has(holder)) return null;
    slots.set(holder, round);
  }
  return { mySlot, slots };
};

// The slots in use must be real rounds and never shared.
export const slotsAreValid = (committee) => {
  const seen = new Set();
  const all = [committee.mySlot, ...(committee.members || []).map((member) => member.slot)].filter((value) => value !== null && value !== undefined);
  for (const slot of all) {
    if (!Number.isInteger(slot) || slot < 1 || slot > committee.size || seen.has(slot)) return false;
    seen.add(slot);
  }
  return true;
};
