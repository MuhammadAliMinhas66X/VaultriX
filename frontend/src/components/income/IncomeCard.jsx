import BrandMark from '../BrandMark.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { amountForTotal, isDeducted } from '../../utils/salaryCuts.js';
import { dateOptions } from '../../utils/dates.js';
import { typeLabelKey, frequencyLabelKey } from './incomeOptions.js';

function IncomeCard({ stream, selected, flash, converted, currency, onSelect }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const deducted = isDeducted(stream);
  const shown = deducted ? amountForTotal(stream) : stream.expectedAmount;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full flex-col gap-3.5 rounded-2xl border bg-white p-4 text-start outline-none transition-all active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-accent/40 ${
        selected ? 'border-ink shadow-[0_6px_20px_-8px_rgba(0,0,0,0.25)]' : 'border-border hover:border-ink/30 hover:shadow-sm'
      } ${flash ? 'ring-2 ring-ink/30' : ''}`}
    >
      <span className="flex items-start gap-3.5">
        <BrandMark method={stream.destinationMethod} name={stream.destinationName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink">{stream.name}</span>
          <span className="mt-0.5 block truncate text-sm text-muted">{t(typeLabelKey(stream.incomeType))}</span>
        </span>
        <span className="shrink-0 text-end">
          {shown !== null ? (
            <>
              <span className="block text-base font-semibold tabular-nums text-ink">{formatMoney(shown, { decimals: 0, currency: stream.currency })}</span>
              {deducted ? (
                <span className="block text-xs text-muted">{t('income.afterDeductions')}</span>
              ) : (
                converted !== null && <span className="block text-xs tabular-nums text-muted">{t('income.approx', { amount: formatMoney(converted, { decimals: 0, currency }) })}</span>
              )}
            </>
          ) : (
            <span className="text-sm text-muted">-</span>
          )}
        </span>
      </span>

      <span className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
        <span className="rounded-full bg-surface px-2.5 py-1 font-medium text-ink">{t(frequencyLabelKey(stream.frequency))}</span>
        <span className="rounded-full bg-surface px-2.5 py-1 font-medium text-muted">{formatDate(new Date(stream.receivedAt || stream.createdAt), dateOptions)}</span>
      </span>
    </button>
  );
}

export default IncomeCard;
