import { dateOptions } from '../../utils/dates.js';

export const statusLabel = (t, formatDate, loan, state) => {
  if (state.done) return t('loans.statusDone');
  if (state.overdue) return t('loans.overdue');
  if (state.daysLeft === null) return t('loans.statusOpen');
  if (state.daysLeft === 0) return t('loans.dueToday');
  if (state.daysLeft === 1) return t('loans.dueTomorrow');
  if (state.daysLeft <= 7) return t('loans.dueInDays', { days: state.daysLeft });
  return t('loans.dueOn', { date: formatDate(new Date(loan.dueAt), dateOptions) });
};

export const statusClass = (state) => {
  if (state.overdue) return 'bg-ink text-white';
  if (state.dueSoon) return 'bg-white text-ink ring-1 ring-ink';
  return 'bg-surface text-muted';
};
