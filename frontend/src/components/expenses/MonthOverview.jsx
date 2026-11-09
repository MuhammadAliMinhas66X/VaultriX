import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import AnimatedAmount from '../AnimatedAmount.jsx';
import DailyChart from './DailyChart.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';

function MonthOverview({ month, label, total, others = 0, days, todayDay, currency, perDay, change, biggest, count, lent = 0, onPrev, onNext, canNext, busy }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const money = (value) => formatMoney(value, { decimals: 0, currency });
  const dayLabel = (day) => formatDate(new Date(`${month}-${String(day).padStart(2, '0')}T00:00:00Z`), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

  const arrow = 'flex h-9 w-9 items-center justify-center rounded-full text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent';
  const up = change !== null && change > 0;
  const stats = [
    { key: 'avg', label: t('expenses.insightAvg'), value: money(perDay) },
    { key: 'big', label: t('expenses.insightBiggest'), value: biggest ? money(biggest.value) : '-' },
    { key: 'count', label: t('expenses.insightCount'), value: String(count) },
  ];

  return (
    <section
      className="relative overflow-hidden rounded-3xl p-5 text-white shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] sm:p-7"
      style={{
        backgroundColor: '#0f0f12',
        backgroundImage:
          'radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.16), transparent 55%), radial-gradient(90% 70% at 0% 100%, rgba(255,255,255,0.07), transparent 60%), linear-gradient(150deg, #1d1d24, #0b0b0e)',
      }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full border border-white/10" />
      <span aria-hidden="true" className="pointer-events-none absolute -end-8 -top-8 h-36 w-36 rounded-full border border-white/10" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-full bg-white/10 p-1 ring-1 ring-white/10 backdrop-blur">
          <button type="button" onClick={onPrev} aria-label={t('expenses.prevMonth')} className={arrow}>
            <ChevronLeft className="h-[18px] w-[18px] rtl:rotate-180" />
          </button>
          <p className="min-w-[8.5rem] px-1 text-center text-sm font-semibold capitalize">{label}</p>
          <button type="button" onClick={onNext} disabled={!canNext} aria-label={t('expenses.nextMonth')} className={arrow}>
            <ChevronRight className="h-[18px] w-[18px] rtl:rotate-180" />
          </button>
        </div>
        {change !== null && (
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10">
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span className="tabular-nums">
              {up ? '+' : ''}
              {Math.round(change)}%
            </span>
            <span className="font-medium text-white/60">{t('expenses.insightVs')}</span>
          </span>
        )}
      </div>

      <div className={`relative mt-6 transition-opacity ${busy ? 'opacity-50' : ''}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">{t('expenses.spentThisMonth')}</p>
        <p className="mt-2 break-words text-[2.25rem] font-bold leading-none tracking-tight tabular-nums sm:text-[2.75rem]">
          <AnimatedAmount value={total} format={(value) => formatMoney(value, { decimals: 2, currency })} />
        </p>
        {lent > 0 && <p className="mt-2 text-xs tabular-nums text-white/55">{t('expenses.givenNote', { amount: formatMoney(lent, { decimals: 2, currency }) })}</p>}
        {others > 0 && <p className="mt-2.5 text-xs tabular-nums text-white/55">{t('expenses.paidByOthers', { amount: formatMoney(others, { decimals: 2, currency }) })}</p>}
      </div>

      <div className={`relative mt-6 transition-opacity ${busy ? 'opacity-50' : ''}`}>
        <DailyChart days={days} todayDay={todayDay} perDay={perDay} month={month} money={money} dayLabel={dayLabel} summary={`${label}: ${formatMoney(total, { decimals: 0, currency })}`} />
      </div>

      <dl className="relative mt-5 grid grid-cols-3 border-t border-white/10 pt-4">
        {stats.map((item, index) => (
          <div key={item.key} className={`min-w-0 ${index > 0 ? 'border-s border-white/10 ps-4' : ''}`}>
            <dt className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50">{item.label}</dt>
            <dd className="mt-1.5 truncate text-sm font-bold tabular-nums sm:text-base">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default MonthOverview;
