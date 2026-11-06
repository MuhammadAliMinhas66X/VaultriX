import { toBase } from './incomeMath.js';
import { dayKey } from './expenseMath.js';

export const VIEWS = ['all', 'upcoming', 'unpaid', 'overdue', 'partial', 'paid', 'cancelled'];
export const FREQUENCIES = ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

const OPEN = ['upcoming', 'dueToday', 'overdue', 'partial'];
const EPSILON = 0.004;
export const SOON_DAYS = 7;

export const billStatus = (bill, today) => {
  if (bill.cancelledAt) return 'cancelled';
  if (bill.remaining <= EPSILON) return 'paid';
  if (bill.paid > EPSILON) return 'partial';
  const due = dayKey(bill.dueAt);
  if (due === today) return 'dueToday';
  if (due < today) return 'overdue';
  return 'upcoming';
};

export const isPastDue = (bill, today) => !bill.cancelledAt && bill.remaining > EPSILON && dayKey(bill.dueAt) < today;

export const daysBetween = (fromKey, toKey) => Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86400000);

export const matchesView = (bill, view, today) => {
  const status = billStatus(bill, today);
  if (view === 'all') return true;
  if (view === 'upcoming') return status === 'upcoming' || status === 'dueToday';
  if (view === 'unpaid') return OPEN.includes(status);
  if (view === 'overdue') return isPastDue(bill, today);
  if (view === 'partial') return status === 'partial';
  if (view === 'paid') return status === 'paid';
  if (view === 'cancelled') return status === 'cancelled';
  return true;
};

export const countByView = (bills, today) => {
  const counts = {};
  VIEWS.forEach((view) => {
    counts[view] = bills.filter((bill) => matchesView(bill, view, today)).length;
  });
  return counts;
};

const RANK = { overdue: 0, dueToday: 1, partial: 2, upcoming: 3, paid: 4, cancelled: 5 };

export const sortBills = (list, view, today) => {
  const copy = [...list];
  if (view === 'paid' || view === 'cancelled') return copy.sort((a, b) => dayKey(b.dueAt).localeCompare(dayKey(a.dueAt)));
  return copy.sort((a, b) => {
    const rank = RANK[billStatus(a, today)] - RANK[billStatus(b, today)];
    if (rank !== 0 && view === 'all') return rank;
    const order = dayKey(a.dueAt).localeCompare(dayKey(b.dueAt));
    if (RANK[billStatus(a, today)] >= 4) return -order;
    return order;
  });
};

export const summarizeBills = (bills, rates, base, today) => {
  const month = today.slice(0, 7);
  const out = {
    unpaidCount: 0,
    unpaidTotal: 0,
    overdueCount: 0,
    overdueTotal: 0,
    dueTodayCount: 0,
    dueTodayTotal: 0,
    upcomingCount: 0,
    soonCount: 0,
    soonTotal: 0,
    partialCount: 0,
    paidMonthCount: 0,
    paidMonthTotal: 0,
    nextRecurring: null,
    excluded: 0,
  };

  const convert = (amount, code) => (code === base ? amount : toBase(amount, code, rates));

  bills.forEach((bill) => {
    const status = billStatus(bill, today);

    bill.payments.forEach((payment) => {
      if (dayKey(payment.paidAt).slice(0, 7) !== month || bill.cancelledAt) return;
      const value = convert(payment.amount, bill.currency);
      if (value === null) out.excluded += 1;
      else out.paidMonthTotal += value;
    });

    if (status === 'paid') {
      const last = bill.payments.reduce((max, payment) => (dayKey(payment.paidAt) > max ? dayKey(payment.paidAt) : max), '');
      if (last.slice(0, 7) === month) out.paidMonthCount += 1;
    }

    if (OPEN.includes(status)) {
      const value = convert(bill.remaining, bill.currency);
      out.unpaidCount += 1;
      if (value === null) out.excluded += 1;
      else out.unpaidTotal += value;
      if (isPastDue(bill, today)) {
        out.overdueCount += 1;
        if (value !== null) out.overdueTotal += value;
      }
      if (status === 'dueToday') {
        out.dueTodayCount += 1;
        if (value !== null) out.dueTodayTotal += value;
      }
      if (status === 'upcoming') out.upcomingCount += 1;
      if ((status === 'upcoming' || status === 'partial') && !isPastDue(bill, today) && daysBetween(today, dayKey(bill.dueAt)) <= SOON_DAYS) {
        out.soonCount += 1;
        if (value !== null) out.soonTotal += value;
      }
      if (status === 'partial') out.partialCount += 1;
    }

    if (bill.isHead && bill.frequency !== 'none' && bill.seriesState === 'active' && bill.nextBillAt && dayKey(bill.nextBillAt) >= today) {
      const key = dayKey(bill.nextBillAt);
      if (!out.nextRecurring || key < out.nextRecurring.key) out.nextRecurring = { key, billerName: bill.billerName };
    }
  });

  return out;
};

export const attention = (bills, today, limit = 3) =>
  sortBills(
    bills.filter((bill) => OPEN.includes(billStatus(bill, today))),
    'unpaid',
    today
  ).slice(0, limit);

export const SECTIONS = ['overdue', 'today', 'soon', 'later', 'paid', 'cancelled'];

export const sectionOf = (bill, today) => {
  const status = billStatus(bill, today);
  if (status === 'cancelled') return 'cancelled';
  if (status === 'paid') return 'paid';
  const due = dayKey(bill.dueAt);
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  return daysBetween(today, due) <= SOON_DAYS ? 'soon' : 'later';
};

// Groups bills the way a person thinks about them: what needs attention first.
export const groupBills = (list, today) => {
  const groups = SECTIONS.map((key) => ({ key, bills: [] }));
  list.forEach((bill) => groups.find((group) => group.key === sectionOf(bill, today)).bills.push(bill));
  groups.forEach((group) => {
    group.bills.sort((a, b) => {
      const order = dayKey(a.dueAt).localeCompare(dayKey(b.dueAt));
      return group.key === 'paid' || group.key === 'cancelled' ? -order : order;
    });
    const currencies = new Set(group.bills.map((bill) => bill.currency));
    group.currency = currencies.size === 1 ? [...currencies][0] : null;
    group.total = group.bills.reduce((sum, bill) => sum + (group.key === 'paid' || group.key === 'cancelled' ? bill.total : bill.remaining), 0);
  });
  return groups.filter((group) => group.bills.length > 0);
};

// What to say next to a bill: relative to today, never a bare date.
export const dueNote = (bill, today) => {
  const status = billStatus(bill, today);
  if (status === 'cancelled') return { key: 'bills.rowCancelled' };
  if (status === 'paid') {
    const last = bill.payments.reduce((max, payment) => (dayKey(payment.paidAt) > max ? dayKey(payment.paidAt) : max), '');
    return { key: 'bills.rowPaidOn', date: last || dayKey(bill.dueAt) };
  }
  const gap = daysBetween(today, dayKey(bill.dueAt));
  if (gap < 0) return { key: 'bills.rowOverdueDays', count: -gap, strong: true };
  if (gap === 0) return { key: 'bills.rowDueToday', strong: true };
  if (gap === 1) return { key: 'bills.rowDueTomorrow' };
  return { key: 'bills.rowDueInDays', count: gap };
};
