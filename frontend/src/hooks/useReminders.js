import { useMemo } from 'react';
import { useResource } from '../data/useResource.js';
import { todayInput } from '../utils/dates.js';
import { buildReminders } from '../utils/reminders.js';
import { committeeAttention } from '../utils/committeeMath.js';

const NONE = [];

// Bills, loans and committee payments that are overdue or due within a week. Shared by the bell in
// the top bar and the Reminders card on the Dashboard (one fetch, one rule).
export function useReminders() {
  const today = todayInput();
  const billsResource = useResource('bills', { today });
  const loansResource = useResource('loans');
  const bills = billsResource.data ? billsResource.data.bills : NONE;
  const loans = loansResource.data ? loansResource.data.loans : NONE;
  const committeesResource = useResource('committees', { today });
  const committees = committeesResource.data ? committeesResource.data.committees : NONE;
  const items = useMemo(() => [...buildReminders(bills, loans, today), ...committeeAttention(committees, today)].sort((a, b) => a.days - b.days), [bills, loans, committees, today]);
  return { items, ready: Boolean(billsResource.data) };
}
