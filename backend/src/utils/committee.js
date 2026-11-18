// Dates and status of a committee. Everything works on whole days (UTC) so a round never moves
// because of a time zone.
export const FREQUENCIES = ['monthly', 'weekly'];

const dayString = (date) => date.toISOString().slice(0, 10);

// The due day of round `round` (1 = the start date). Monthly keeps the day of month and uses the
// last day of shorter months (the 31st becomes the 28th, 29th or 30th), without drifting.
export const roundDay = (startDate, frequency, round) => {
  const start = new Date(startDate);
  const steps = round - 1;
  if (frequency === 'weekly') return dayString(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + steps * 7)));
  const monthIndex = start.getUTCMonth() + steps;
  const year = start.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return dayString(new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay))));
};

// today: 'YYYY-MM-DD' from the user's own clock.
export const committeeSummary = (committee, today) => {
  const paidByRound = new Map(committee.paid.map((item) => [item.round, item]));
  const rounds = [];
  for (let round = 1; round <= committee.size; round += 1) {
    const due = roundDay(committee.startDate, committee.frequency, round);
    const entry = paidByRound.get(round);
    const status = entry ? 'paid' : due < today ? 'overdue' : due === today ? 'due' : 'upcoming';
    rounds.push({ round, due, status, paidAt: entry ? dayString(new Date(entry.paidAt)) : null, mine: round === committee.mySlot });
  }
  const paidMinor = committee.paid.reduce((sum, item) => sum + item.amountMinor, 0);
  const totalMinor = committee.contributionMinor * committee.size;
  const next = rounds.find((item) => item.status !== 'paid') || null;
  const payoutDay = rounds[committee.mySlot - 1].due;
  const received = Boolean(committee.payoutReceivedAt);
  const payoutStatus = received ? 'received' : payoutDay <= today ? 'ready' : 'upcoming';
  return {
    rounds,
    paidCount: committee.paid.length,
    paidMinor,
    totalMinor,
    next,
    overdueCount: rounds.filter((item) => item.status === 'overdue').length,
    payoutMinor: totalMinor,
    payoutDay,
    payoutStatus,
    endDay: rounds[rounds.length - 1].due,
    finished: committee.paid.length === committee.size && received,
  };
};
