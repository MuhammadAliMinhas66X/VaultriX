// Same day rule as the server (`backend/src/utils/committee.js`): used only to preview a committee
// while it is being typed. The saved numbers always come from the server.
const dayString = (date) => date.toISOString().slice(0, 10);

export const roundDay = (startDay, frequency, round) => {
  const [year, month, day] = startDay.split('-').map(Number);
  const steps = round - 1;
  if (frequency === 'weekly') return dayString(new Date(Date.UTC(year, month - 1, day + steps * 7)));
  const monthIndex = month - 1 + steps;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return dayString(new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay))));
};

// The user's own calendar day (not UTC), as YYYY-MM-DD.
export const localDay = (now = new Date()) => new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
