import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import BrandMark from '../BrandMark.jsx';
import SalaryCutsPanel from './SalaryCutsPanel.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { supportsCuts } from '../../utils/salaryCuts.js';
import { typeLabelKey, frequencyLabelKey, detailKind } from './incomeOptions.js';

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

function IncomeRow({ index, stream, converted, currency, expanded, onToggle, onEdit, onDelete, onCutsChange }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();

  const receivedIn = stream.destinationMethod === 'cash' ? t('income.method.cash') : stream.destinationName;
  const kind = detailKind(stream.incomeType);
  const cutsEligible = supportsCuts(stream);

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-start transition hover:bg-surface/60 sm:gap-4 sm:px-5"
      >
        <span className="w-6 shrink-0 text-xs font-medium tabular-nums text-muted">{String(index + 1).padStart(2, '0')}</span>
        <BrandMark method={stream.destinationMethod} name={stream.destinationName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink sm:text-base">{stream.name}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            {t(typeLabelKey(stream.incomeType))} · {t(frequencyLabelKey(stream.frequency))}
          </span>
        </span>
        {stream.expectedAmount !== null && (
          <span className="shrink-0 text-end">
            <span className="block text-sm font-semibold tabular-nums text-ink sm:text-base">
              {formatMoney(stream.expectedAmount, { decimals: 0, currency: stream.currency })}
            </span>
            {converted !== null && (
              <span className="block text-xs tabular-nums text-muted">
                {t('income.approx', { amount: formatMoney(converted, { decimals: 0, currency }) })}
              </span>
            )}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-border px-4 py-4 sm:px-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3">
            <Detail label={t('income.typeLabel')}>{t(typeLabelKey(stream.incomeType))}</Detail>
            <Detail label={t('income.frequencyLabel')}>{t(frequencyLabelKey(stream.frequency))}</Detail>
            <Detail label={t('income.payerLabel')}>{stream.payerName || '-'}</Detail>
            <Detail label={t('income.destinationMethodLabel')}>
              <span className="flex items-center gap-2">
                <BrandMark method={stream.destinationMethod} name={stream.destinationName} size="sm" />
                <span className="min-w-0 break-words">{receivedIn}</span>
              </span>
            </Detail>
            {stream.typeDetail && <Detail label={t(`income.detail${kind}Label`)}>{stream.typeDetail}</Detail>}
          </dl>

          {cutsEligible && <SalaryCutsPanel stream={stream} onChange={onCutsChange} />}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium text-ink transition hover:bg-surface"
            >
              <Pencil className="h-4 w-4" /> {t('income.edit')}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> {t('income.delete')}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default IncomeRow;
