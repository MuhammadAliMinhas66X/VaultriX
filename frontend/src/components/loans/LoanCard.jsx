import { Check } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { initialsFromName } from '../../utils/avatar.js';
import { dateOptions } from '../../utils/dates.js';
import { loanState } from '../../utils/loanMath.js';
import { statusLabel, statusClass } from './loanStatus.js';

function LoanCard({ loan, selected, converted, currency, onSelect }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const state = loanState(loan);
  const shown = state.done ? loan.amount : loan.remaining;
  const partial = !state.done && loan.paid > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full flex-col gap-3.5 rounded-2xl border bg-white p-4 text-start outline-none transition-all active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-accent/40 ${
        selected ? 'border-ink shadow-[0_6px_20px_-8px_rgba(0,0,0,0.25)]' : 'border-border hover:border-ink/30 hover:shadow-sm'
      }`}
    >
      <span className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold text-ink">{initialsFromName(loan.personName) || '?'}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink">{loan.personName}</span>
          <span className="mt-0.5 block truncate text-sm text-muted">{t('loans.sentOn', { date: formatDate(new Date(loan.sentAt), dateOptions) })}</span>
        </span>
        <span className="shrink-0 text-end">
          <span className="block text-base font-semibold tabular-nums text-ink">{formatMoney(shown, { decimals: 0, maxDecimals: 4, currency: loan.currency })}</span>
          <span className="block text-xs text-muted">
            {!state.done && converted !== null ? t('income.approx', { amount: formatMoney(converted, { decimals: 0, currency }) }) : state.done ? t('loans.statTotal') : t('loans.chartLeft')}
          </span>
        </span>
      </span>

      {partial && (
        <span className="block h-1.5 w-full overflow-hidden rounded-full bg-border/70">
          <span style={{ width: `${state.progress * 100}%` }} className="block h-full rounded-full bg-ink transition-[width] duration-500" />
        </span>
      )}

      <span className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${statusClass(state)}`}>
          {state.done && <Check className="h-3 w-3" strokeWidth={2.5} />}
          {statusLabel(t, formatDate, loan, state)}
        </span>
        {partial && (
          <span className="rounded-full bg-surface px-2.5 py-1 font-medium tabular-nums text-muted">
            {t('loans.paidOf', { paid: formatMoney(loan.paid, { decimals: 0, maxDecimals: 4, currency: loan.currency }), total: formatMoney(loan.amount, { decimals: 0, maxDecimals: 4, currency: loan.currency }) })}
          </span>
        )}
      </span>
    </button>
  );
}

export default LoanCard;
