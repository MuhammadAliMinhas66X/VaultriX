import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { monthKey, shiftMonth } from '../utils/expenseMath.js';

// Previous / next month with the month name between. Cannot go past the current month.
export default function MonthSwitcher({ month, onChange }) {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const nowMonth = monthKey(new Date());
  const label = formatDate(new Date(`${month}-01T00:00:00Z`), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1">
      <button type="button" aria-label={t('expenses.prevMonth')} onClick={() => onChange(shiftMonth(month, -1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></button>
      <span className="min-w-[8.5rem] text-center text-sm font-semibold text-ink">{label}</span>
      <button type="button" aria-label={t('expenses.nextMonth')} disabled={month >= nowMonth} onClick={() => onChange(shiftMonth(month, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink disabled:opacity-40"><ChevronRight className="h-4 w-4 rtl:rotate-180" /></button>
    </div>
  );
}
