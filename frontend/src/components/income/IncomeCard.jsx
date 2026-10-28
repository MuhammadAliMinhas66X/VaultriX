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
      className={`group flex w-full items-center gap-3.5 rounded-2xl border bg-white p-3.5 text-start outline-none transition-all focus-visible:ring-2 focus-visible:ring-accent/40 sm:p-4 ${
        selected ? 'border-ink shadow-[0_6px_20px_-8px_rgba(0,0,0,0.25)]' : 'border-border hover:border-ink/30 hover:shadow-sm'
      } ${flash ? 'ring-2 ring-ink/30' : ''}`}
    >
      <BrandMark method={stream.destinationMethod} name={stream.destinationName} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink sm:text-[15px]">{stream.name}</span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
          <span className="truncate">
            {t(typeLabelKey(stream.incomeType))} · {t(frequencyLabelKey(stream.frequency))}
          </span>
        </span>
        <span className="mt-1 block truncate text-[11px] text-muted">{formatDate(new Date(stream.receivedAt || stream.createdAt), dateOptions)}</span>
      </span>
      <span className="shrink-0 text-end">
        {shown !== null ? (
          <>
            <span className="block text-sm font-semibold tabular-nums text-ink sm:text-[15px]">{formatMoney(shown, { decimals: 0, currency: stream.currency })}</span>
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
    </button>
  );
}

export default IncomeCard;
