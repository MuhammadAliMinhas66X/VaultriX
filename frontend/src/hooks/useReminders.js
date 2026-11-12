import { useMemo } from 'react';
import { useResource } from '../data/useResource.js';
import { todayInput } from '../utils/dates.js';
import { buildReminders } from '../utils/reminders.js';

const NONE = [];

// Bills and loans that are overdue or due within a week. Shared by the bell in
// the top bar and the Reminders card on the Dashboard (one fetch, one rule).
export function useReminders() {
  const today = todayInput();
  const billsResource = useResource('bills', { today });
  const loansResource = useResource('loans');
  const bills = billsResource.data ? billsResource.data.bills : NONE;
  const loans = loansResource.data ? loansResource.data.loans : NONE;
  const items = useMemo(() => buildReminders(bills, loans, today), [bills, loans, today]);
  return { items, ready: Boolean(billsResource.data) };
}
