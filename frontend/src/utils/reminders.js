import { dayKey } from './expenseMath.js';
import { daysBetween, billStatus } from './billMath.js';

export const REMIND_DAYS = 7;
const EPSILON = 0.004;

// One list of things that need attention: unpaid bills and open loans that are
// overdue or fall due in the next REMIND_DAYS days. Sorted: overdue first (the
// longest overdue on top), then the soonest due.
// Each item: { key, kind: 'bill' | 'loanOwe' | 'loanOwed', id, name, amount, currency, days, href }
// days < 0 means overdue by that many days, 0 means today.
export const buildReminders = (bills, loans, today, limit = REMIND_DAYS) => {
  const items = [];

  (bills || []).forEach((bill) => {
    const status = billStatus(bill, today);
    if (status === 'paid' || status === 'cancelled') return;
    const days = daysBetween(today, dayKey(bill.dueAt));
    if (days > limit) return;
    items.push({ key: `bill-${bill.id}`, kind: 'bill', id: bill.id, name: bill.billerName, amount: bill.remaining, currency: bill.currency, days, href: '/bills' });
  });

  (loans || []).forEach((loan) => {
    if (!loan.dueAt || loan.done || !(loan.remaining > EPSILON)) return;
    const days = daysBetween(today, dayKey(loan.dueAt));
    if (days > limit) return;
    items.push({
      key: `loan-${loan.id}`,
      kind: loan.direction === 'borrowed' ? 'loanOwe' : 'loanOwed',
      id: loan.id,
      name: loan.personName,
      amount: loan.remaining,
      currency: loan.currency,
      days,
      href: '/loans',
    });
  });

  return items.sort((a, b) => a.days - b.days);
};
