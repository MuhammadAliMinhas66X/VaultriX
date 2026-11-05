export const BILL_FREQUENCIES = ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

const DAY_MS = 24 * 60 * 60 * 1000;

const daysInMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

const addMonths = (date, months) => {
  const total = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const day = Math.min(date.getUTCDate(), daysInMonth(year, month));
  return new Date(Date.UTC(year, month, day));
};

export const addSteps = (date, frequency, steps) => {
  if (!date) return null;
  const base = new Date(date);
  if (steps === 0) return base;
  if (frequency === 'daily') return new Date(base.getTime() + steps * DAY_MS);
  if (frequency === 'weekly') return new Date(base.getTime() + steps * 7 * DAY_MS);
  if (frequency === 'monthly') return addMonths(base, steps);
  if (frequency === 'quarterly') return addMonths(base, steps * 3);
  if (frequency === 'yearly') return addMonths(base, steps * 12);
  return base;
};

export const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_MS);

export const defaultNextBillAt = (bill) => addDays(bill.periodEnd || bill.dueAt, 1);

export const makeAnchor = (bill) => ({
  seq: bill.sequence,
  dueAt: bill.dueAt,
  periodStart: bill.periodStart || null,
  periodEnd: bill.periodEnd || null,
  nextBillAt: bill.nextBillAt || null,
});

export const occurrenceDates = (anchor, frequency, sequence) => {
  const steps = sequence - anchor.seq;
  return {
    dueAt: addSteps(anchor.dueAt, frequency, steps),
    periodStart: addSteps(anchor.periodStart, frequency, steps),
    periodEnd: addSteps(anchor.periodEnd, frequency, steps),
  };
};

export const generationDate = (anchor, frequency, sequence) => addSteps(anchor.nextBillAt, frequency, sequence - anchor.seq - 1);

export const skipMissed = (anchor, frequency, nextSeq, today) => {
  let seq = nextSeq;
  let guard = 0;
  while (generationDate(anchor, frequency, seq) < today && guard < 4000) {
    seq += 1;
    guard += 1;
  }
  return seq;
};
