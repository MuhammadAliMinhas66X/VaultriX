const daysInMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

const parse = (key) => {
  const [year, month, day] = String(key).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const format = (date) => date.toISOString().slice(0, 10);

const addMonths = (date, months) => {
  const total = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), daysInMonth(year, month))));
};

const STEP = { daily: 1, weekly: 7 };
const MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };

// Same rule the server uses, so the form can show the real next date:
// 21 Nov repeating monthly gives 21 Dec; 31 Jan gives 28/29 Feb, then back to 31 Mar.
export const addPeriods = (key, frequency, steps = 1) => {
  const date = parse(key);
  if (!date) return '';
  if (STEP[frequency]) return format(new Date(date.getTime() + steps * STEP[frequency] * 86400000));
  if (MONTHS[frequency]) return format(addMonths(date, steps * MONTHS[frequency]));
  return format(date);
};

export const addDaysKey = (key, days) => {
  const date = parse(key);
  if (!date) return '';
  return format(new Date(date.getTime() + days * 86400000));
};

export const toDate = (key) => parse(key);
