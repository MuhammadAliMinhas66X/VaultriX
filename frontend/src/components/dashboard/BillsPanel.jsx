import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Plus, Receipt } from 'lucide-react';
import BrandMark from '../BrandMark.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { attention, daysBetween } from '../../utils/billMath.js';
import { dayKey } from '../../utils/expenseMath.js';

function Stat({ label, value, hot = false }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 px-3 py-3.5 sm:px-4 ${hot ? 'bg-ink text-white' : 'bg-white text-ink'}`}>
      <span className={`text-[10px] font-semibold uppercase leading-tight tracking-[0.04em] sm:text-[11px] sm:tracking-[0.1em] ${hot ? 'text-white/65' : 'text-muted'}`}>{label}</span>
      <span className="text-2xl font-bold leading-none tabular-nums">{value}</span>
    </div>
  );
}

function Countdown({ days, t }) {
  const late = days < 0;
  const label = late ? t('reminders.overdue', { count: Math.abs(days) }) : days === 0 ? t('reminders.today') : t('reminders.inDays', { count: days });
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${late ? 'bg-ink text-white' : days === 0 ? 'bg-ink/10 text-ink ring-1 ring-ink/30' : 'bg-surface text-muted'}`}>{label}</span>;
}

function BillsPanel({ bills, summary, currency, today }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();
  const money = (value) => formatMoney(value, { decimals: 0, currency });

  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white px-6 py-8 text-center sm:flex-row sm:text-start">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
          <Receipt className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium text-ink">{t('bills.dashEmpty')}</p>
        <Link to="/bills?add=1" className="flex shrink-0 items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
          <Plus className="h-4 w-4" /> {t('bills.add')}
        </Link>
      </div>
    );
  }

  const urgent = attention(bills, today, 4);
  const paid = summary ? summary.paidMonthTotal : 0;
  const open = summary ? summary.unpaidTotal : 0;
  const share = paid + open > 0 ? Math.round((paid / (paid + open)) * 100) : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white" aria-label={t('bills.dashTitle')}>
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ink to-[#3a3a42] text-white shadow-sm"><Receipt className="h-[18px] w-[18px]" strokeWidth={2} /></span>
          {t('bills.dashTitle')}
        </h2>
        <Link to="/bills" className="flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-sm font-semibold text-ink transition hover:bg-border/60">
          {t('bills.dashViewAll')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-5 sm:px-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d0d10] via-[#1c1c21] to-[#3b3b44] p-5 text-white">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">{t('bills.statOutstanding')}</p>
              <p className="mt-2 whitespace-nowrap text-[clamp(1.75rem,8vw,2.5rem)] font-bold leading-none tracking-tight tabular-nums">{summary ? money(open) : '-'}</p>
              <p className="mt-2 text-xs text-white/65">{summary ? t('bills.statUnpaidCount', { count: summary.unpaidCount }) : ''}</p>
            </div>
            <div className="w-full min-w-[12rem] sm:w-64">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">{t('bills.statPaidMonth')}</p>
                <p className="whitespace-nowrap text-sm font-bold tabular-nums">{summary ? money(paid) : '-'}</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div style={{ width: `${share}%` }} className="h-full rounded-full bg-white transition-all duration-700" />
              </div>
              <p className="mt-1.5 text-xs text-white/65">{summary ? t('bills.statPaidCount', { count: summary.paidMonthCount }) : ''}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border">
          <Stat label={t('bills.statOverdue')} value={summary ? summary.overdueCount : '-'} hot={Boolean(summary && summary.overdueCount > 0)} />
          <Stat label={t('bills.statDueToday')} value={summary ? summary.dueTodayCount : '-'} hot={Boolean(summary && summary.dueTodayCount > 0)} />
          <Stat label={t('bills.statUpcoming')} value={summary ? summary.upcomingCount : '-'} />
        </div>

        {summary && summary.excluded > 0 && <p className="text-xs text-muted">{t('loans.excludedNote', { count: summary.excluded })}</p>}

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('bills.dashNeedsAttention')}</p>
          {urgent.length === 0 ? (
            <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted">{t('bills.dashNone')}</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {urgent.map((bill) => (
                <li key={bill.id}>
                  <Link to={`/bills?bill=${bill.id}`} className="group flex min-w-0 items-center gap-3 px-3.5 py-3 outline-none transition hover:bg-surface/70 focus-visible:bg-surface/70">
                    <BrandMark method="biller" name={bill.billerName} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{bill.billerName}</span>
                      <span className="mt-1 block">
                        <Countdown days={daysBetween(today, dayKey(bill.dueAt))} t={t} />
                      </span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-sm font-bold tabular-nums text-ink">{formatMoney(bill.remaining, { decimals: 0, currency: bill.currency })}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export default BillsPanel;
