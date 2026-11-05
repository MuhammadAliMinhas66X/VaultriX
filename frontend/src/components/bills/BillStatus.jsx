import { Check } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation.js';

const LABEL_KEY = {
  upcoming: 'bills.statusUpcoming',
  dueToday: 'bills.statusDueToday',
  overdue: 'bills.statusOverdue',
  partial: 'bills.statusPartial',
  paid: 'bills.statusPaid',
  cancelled: 'bills.statusCancelled',
};

const TONE = {
  upcoming: 'bg-surface text-muted',
  dueToday: 'bg-white text-ink ring-1 ring-ink',
  overdue: 'bg-ink text-white',
  partial: 'bg-surface text-ink ring-1 ring-ink/30',
  paid: 'bg-surface text-ink',
  cancelled: 'bg-surface text-muted line-through',
};

export const FREQUENCY_KEY = {
  none: 'bills.freqNone',
  daily: 'bills.freqDaily',
  weekly: 'bills.freqWeekly',
  monthly: 'bills.freqMonthly',
  quarterly: 'bills.freqQuarterly',
  yearly: 'bills.freqYearly',
};

export function StatusBadge({ status, pastDue = false }) {
  const { t } = useTranslation();
  return (
    <>
      <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${TONE[status]}`}>
        {status === 'paid' && <Check className="h-3 w-3" strokeWidth={2.5} />}
        {t(LABEL_KEY[status])}
      </span>
      {pastDue && status === 'partial' && <span className="inline-flex items-center whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white">{t('bills.statusOverdue')}</span>}
    </>
  );
}
