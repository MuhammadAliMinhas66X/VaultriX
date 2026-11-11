import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { dateOptions } from '../../utils/dates.js';

const money = { decimals: 2 };

function Stat({ label, value, strong = false }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 whitespace-nowrap tabular-nums text-ink ${strong ? 'text-2xl font-semibold tracking-tight sm:text-3xl' : 'text-base font-semibold'}`}>{value}</p>
    </div>
  );
}

// Left this month (with month switching), received and spent, plus the running
// total and the opening balance. All numbers come from useBalance.
function BalanceOverview({ balance, month, canGoNext, onMonthChange, onEditOpening }) {
  const { t } = useTranslation();
  const { currency } = useAuth();
  const { formatMoney, formatDate } = useFormat();
  const [year, monthNumber] = month.split('-').map(Number);
  const label = formatDate(new Date(year, monthNumber - 1, 1), { month: 'long', year: 'numeric' });
  const data = balance.data;
  const opening = balance.opening;
  const hasOpening = Boolean(opening && opening.amount > 0);

  const step = 'flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-ink outline-none transition hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <section className="rounded-2xl border border-border bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="text-base font-semibold tracking-tight text-ink">{t('balance.title')}</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onMonthChange(-1)} aria-label={t('balance.prevMonth')} className={step}>
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <span className="min-w-[8.5rem] text-center text-sm font-medium text-ink">{label}</span>
          <button type="button" onClick={() => onMonthChange(1)} disabled={!canGoNext} aria-label={t('balance.nextMonth')} className={step}>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {balance.status !== 'ready' ? (
        <p className="px-5 py-8 text-sm text-muted">{balance.status === 'wait' ? t('balance.loading') : t('balance.unavailable')}</p>
      ) : (
        <div className="flex flex-col gap-5 px-5 py-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <Stat strong label={t('balance.leftThisMonth')} value={formatMoney(data.month.left, { ...money, currency })} />
            </div>
            <Stat label={t('balance.received')} value={formatMoney(data.month.received, { ...money, currency })} />
            <Stat label={t('balance.spent')} value={formatMoney(data.month.spentSelf, { ...money, currency })} />
            <Stat label={t('balance.running')} value={formatMoney(data.running, { ...money, currency })} />
          </div>

          {(data.overspentMonth || data.belowZero) && (
            <div role="status" className="flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <p>
                {data.belowZero ? t('balance.overspentTotal') : t('balance.overspentMonth', { amount: formatMoney(Math.abs(data.month.left), { ...money, currency }) })}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-muted">
            <p>
              {hasOpening
                ? t('balance.openingFrom', { amount: formatMoney(opening.amount, { ...money, currency: opening.currency || currency }), date: formatDate(new Date(`${opening.asOf}T00:00:00Z`), dateOptions) })
                : t('balance.openingNone')}
            </p>
            <button type="button" onClick={onEditOpening} className="font-semibold text-ink underline-offset-2 outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-accent/40">
              {hasOpening ? t('balance.editOpening') : t('balance.setOpening')}
            </button>
          </div>
          <p className="-mt-3 text-xs text-muted">
            {t('balance.rateNote')}
            {data.excluded > 0 ? ` ${t('balance.excluded', { count: data.excluded })}` : ''}
          </p>
        </div>
      )}
    </section>
  );
}

export default BalanceOverview;
