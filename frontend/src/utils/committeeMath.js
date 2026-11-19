// Same day rule as the server (`backend/src/utils/committee.js`): used only to preview a committee
// while it is being typed. The saved numbers always come from the server.
const dayString = (date) => date.toISOString().slice(0, 10);

export const roundDay = (startDay, frequency, round) => {
  const [year, month, day] = startDay.split('-').map(Number);
  const steps = round - 1;
  if (frequency === 'daily') return dayString(new Date(Date.UTC(year, month - 1, day + steps)));
  if (frequency === 'weekly') return dayString(new Date(Date.UTC(year, month - 1, day + steps * 7)));
  const monthIndex = month - 1 + steps;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return dayString(new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay))));
};

// The user's own calendar day (not UTC), as YYYY-MM-DD.
export const localDay = (now = new Date()) => new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// One list of committee things that need attention, same shape as the bill reminders:
// { key, kind, id, name, amount, currency, days, href }. days < 0 = overdue by that many days.
const MS_DAY = 24 * 60 * 60 * 1000;
const daysFrom = (today, day) => Math.round((new Date(`${day}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / MS_DAY);

export const committeeAttention = (committees, today, limit = 7) => {
  const items = [];
  (committees || []).forEach((committee) => {
    if (committee.finished) return;
    const href = `/committees/${committee.id}`;
    if (committee.next && committee.next.status !== 'paid') {
      const days = daysFrom(today, committee.next.due);
      if (days <= limit) items.push({ key: `committee-pay-${committee.id}`, kind: 'committeePay', id: committee.id, name: committee.name, amount: committee.contribution, currency: committee.currency, days, href });
    }
    if (committee.role === 'organizer') {
      if (committee.lateMembers > 0) items.push({ key: `committee-late-${committee.id}`, kind: 'committeeLate', id: committee.id, name: committee.name, amount: committee.owed, currency: committee.currency, days: -1, count: committee.lateMembers, href });
      if (committee.potsToHandOver > 0) items.push({ key: `committee-pot-${committee.id}`, kind: 'committeePot', id: committee.id, name: committee.name, amount: committee.payout, currency: committee.currency, days: 0, count: committee.potsToHandOver, href });
    }
    if (committee.payoutStatus === 'ready') items.push({ key: `committee-get-${committee.id}`, kind: 'committeePayout', id: committee.id, name: committee.name, amount: committee.payout, currency: committee.currency, days: 0, href });
  });
  return items.sort((a, b) => a.days - b.days);
};
