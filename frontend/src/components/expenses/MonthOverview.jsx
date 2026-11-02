import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';

function MonthOverview({ month, label, total, days, todayDay, currency, onPrev, onNext, canNext, busy }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();
  const [picked, setPicked] = useState(null);
  const max = Math.max(...days.map((item) => item.amount), 0);
  const shown = picked ? days.find((item) => item.day === picked) : null;

  const arrow = 'flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-ink outline-none transition hover:border-ink/40 focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <section className="rounded-2xl border border-border bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onPrev} aria-label={t('expenses.prevMonth')} className={arrow}>
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <p className="text-sm font-semibold capitalize text-ink">{label}</p>
        <button type="button" onClick={onNext} disabled={!canNext} aria-label={t('expenses.nextMonth')} className={arrow}>
          <ChevronRight className="h-5 w-5 rtl:rotate-180" />
        </button>
      </div>

      <div className={`mt-5 transition-opacity ${busy ? 'opacity-50' : ''}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('expenses.spentThisMonth')}</p>
        <p className="mt-2 break-words text-[2rem] font-bold leading-none tracking-tight tabular-nums text-ink sm:text-[2.5rem]">{formatMoney(total, { decimals: 2, currency })}</p>

        <div role="group" aria-label={t('expenses.chartLabel')} className="mt-6 flex h-24 items-end gap-[3px]" onMouseLeave={() => setPicked(null)}>
          {days.map((item) => {
            const height = max > 0 ? Math.max(6, (item.amount / max) * 100) : 6;
            const active = item.day === todayDay;
            return (
              <button
                key={item.day}
                type="button"
                onMouseEnter={() => setPicked(item.day)}
                onFocus={() => setPicked(item.day)}
                onClick={() => setPicked((prev) => (prev === item.day ? null : item.day))}
                aria-label={`${item.day}: ${formatMoney(item.amount, { decimals: 0, currency })}`}
                className="group flex h-full min-w-0 flex-1 items-end outline-none"
              >
                <span
                  style={{ height: `${height}%` }}
                  className={`w-full rounded-full transition-colors ${item.amount > 0 ? (picked === item.day ? 'bg-ink' : active ? 'bg-ink' : 'bg-ink/55') : 'bg-border'} group-focus-visible:ring-2 group-focus-visible:ring-accent/40`}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex h-4 items-center justify-between text-[11px] tabular-nums text-muted">
          <span>1</span>
          <span className="font-medium text-ink">{shown ? `${shown.day} · ${formatMoney(shown.amount, { decimals: 0, currency })}` : ''}</span>
          <span>{days.length}</span>
        </div>
      </div>
    </section>
  );
}

export default MonthOverview;
