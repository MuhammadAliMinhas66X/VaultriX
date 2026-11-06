import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, History, ListChecks, Plus, Receipt } from 'lucide-react';
import BrandMark from '../BrandMark.jsx';
import { StatusBadge } from '../bills/BillStatus.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { dateOptions } from '../../utils/dates.js';
import { attention, billStatus, isPastDue } from '../../utils/billMath.js';

function Tile({ label, value, sub, tone = 'plain' }) {
  const tones = { plain: 'border-border bg-white text-ink', dark: 'border-ink bg-ink text-white', alert: 'border-ink bg-white text-ink ring-1 ring-ink' };
  const muted = tone === 'dark' ? 'text-white/65' : 'text-muted';
  return (
    <div className={`flex min-w-0 flex-col justify-between rounded-2xl border p-4 ${tones[tone]}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${muted}`}>{label}</p>
      <p className="mt-2 break-words text-xl font-bold leading-tight tracking-tight tabular-nums sm:text-2xl">{value}</p>
      <p className={`mt-1 min-h-[1rem] text-xs ${muted}`}>{sub}</p>
    </div>
  );
}

function Mini({ label, value, strong = false }) {
  return (
    <div className={`min-w-0 rounded-xl px-3.5 py-3 ${strong ? 'bg-ink text-white' : 'bg-surface text-ink'}`}>
      <p className={`truncate text-[11px] font-semibold uppercase tracking-[0.1em] ${strong ? 'text-white/65' : 'text-muted'}`}>{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

const action = 'flex min-w-0 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-ink outline-none transition hover:border-ink/30 hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/40';

function BillsPanel({ bills, summary, currency, today }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
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

  const urgent = attention(bills, today, 3);

  return (
    <section className="rounded-2xl border border-border bg-white" aria-label={t('bills.dashTitle')}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{t('bills.dashTitle')}</p>
        <Link to="/bills" className="flex items-center gap-1.5 text-sm font-medium text-ink transition hover:opacity-70">
          {t('bills.dashViewAll')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Tile tone="dark" label={t('bills.statOutstanding')} value={summary ? money(summary.unpaidTotal) : '-'} sub={summary ? t('bills.statUnpaidCount', { count: summary.unpaidCount }) : ''} />
          <Tile label={t('bills.statPaidMonth')} value={summary ? money(summary.paidMonthTotal) : '-'} sub={summary ? t('bills.statPaidCount', { count: summary.paidMonthCount }) : ''} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Mini label={t('bills.statDueToday')} value={summary ? summary.dueTodayCount : '-'} strong={Boolean(summary && summary.dueTodayCount > 0)} />
          <Mini label={t('bills.statOverdue')} value={summary ? summary.overdueCount : '-'} strong={Boolean(summary && summary.overdueCount > 0)} />
          <Mini label={t('bills.statUpcoming')} value={summary ? summary.upcomingCount : '-'} />
        </div>

        {summary && summary.excluded > 0 && <p className="text-xs text-muted">{t('loans.excludedNote', { count: summary.excluded })}</p>}

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('bills.dashNeedsAttention')}</p>
          {urgent.length === 0 ? (
            <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted">{t('bills.dashNone')}</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {urgent.map((bill) => (
                <li key={bill.id}>
                  <Link to={`/bills?bill=${bill.id}`} className="flex min-w-0 items-center gap-3 px-3.5 py-3 outline-none transition hover:bg-surface/60 focus-visible:bg-surface/60">
                    <BrandMark method="biller" name={bill.billerName} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{bill.billerName}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={billStatus(bill, today)} pastDue={isPastDue(bill, today)} />
                      </span>
                    </span>
                    <span className="shrink-0 text-end">
                      <span className="block text-sm font-semibold tabular-nums text-ink">{formatMoney(bill.remaining, { decimals: 2, currency: bill.currency })}</span>
                      <span className="block text-xs text-muted">{formatDate(new Date(bill.dueAt), dateOptions)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Link to="/bills?add=1" className={action}>
            <Plus className="h-4 w-4 shrink-0" /> <span className="truncate">{t('bills.quickAdd')}</span>
          </Link>
          <Link to="/bills?view=unpaid" className={action}>
            <ListChecks className="h-4 w-4 shrink-0" /> <span className="truncate">{t('bills.quickUnpaid')}</span>
          </Link>
          <Link to={urgent[0] ? `/bills?bill=${urgent[0].id}&pay=1` : '/bills?view=unpaid'} className={action}>
            <CreditCard className="h-4 w-4 shrink-0" /> <span className="truncate">{t('bills.quickPay')}</span>
          </Link>
          <Link to="/bills?view=paid" className={action}>
            <History className="h-4 w-4 shrink-0" /> <span className="truncate">{t('bills.quickHistory')}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default BillsPanel;
