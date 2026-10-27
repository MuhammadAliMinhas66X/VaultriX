import { useState } from 'react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import BrandMark from '../BrandMark.jsx';
import SalaryCutsPanel from './SalaryCutsPanel.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { amountForTotal, supportsCuts } from '../../utils/salaryCuts.js';
import { typeLabelKey, frequencyLabelKey, detailKind } from './incomeOptions.js';

export const ROW_GRID =
  'grid items-center gap-x-3 grid-cols-[1.75rem_minmax(0,1fr)_auto_1rem] md:gap-x-4 md:grid-cols-[2rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_1rem]';

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

export function IncomeHeaderRow() {
  const { t } = useTranslation();
  const cell = 'text-xs font-medium uppercase tracking-wide text-muted';
  return (
    <div className={`${ROW_GRID} hidden border-b border-border bg-surface/60 px-5 py-3 md:grid`}>
      <span className={cell}>#</span>
      <span className={cell}>{t('income.nameLabel')}</span>
      <span className={cell}>{t('income.frequencyLabel')}</span>
      <span className={cell}>{t('income.destinationMethodLabel')}</span>
      <span className={`${cell} text-end`}>{t('income.expectedAmountLabel')}</span>
      <span />
    </div>
  );
}

function IncomeRow({ index, stream, converted, currency, expanded, onToggle, onEdit, onDelete, onCutsChange, cutsStatus }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();
  const [confirming, setConfirming] = useState(false);

  const receivedIn = stream.destinationMethod === 'cash' ? t('income.method.cash') : stream.destinationName;
  const kind = detailKind(stream.incomeType);
  const cutsEligible = supportsCuts(stream);
  const deducted = cutsEligible && stream.deductFromTotal;
  const shownAmount = deducted ? amountForTotal(stream) : stream.expectedAmount;

  return (
    <li id={`stream-${stream.id}`} className="scroll-mt-20 border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`${ROW_GRID} w-full px-4 py-3.5 text-start transition-colors hover:bg-surface/60 sm:px-5 ${expanded ? 'bg-surface/40' : ''}`}
      >
        <span className="text-xs font-medium tabular-nums text-muted">{String(index + 1).padStart(2, '0')}</span>

        <span className="flex min-w-0 items-center gap-3">
          <BrandMark method={stream.destinationMethod} name={stream.destinationName} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink sm:text-[15px]">{stream.name}</span>
            <span className="mt-0.5 block truncate text-xs text-muted">
              {t(typeLabelKey(stream.incomeType))}
              <span className="md:hidden"> · {t(frequencyLabelKey(stream.frequency))}</span>
            </span>
          </span>
        </span>

        <span className="hidden md:block">
          <span className="inline-flex rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink">{t(frequencyLabelKey(stream.frequency))}</span>
        </span>

        <span className="hidden min-w-0 items-center gap-2 md:flex">
          <BrandMark method={stream.destinationMethod} name={stream.destinationName} size="sm" />
          <span className="truncate text-sm text-ink">{receivedIn}</span>
        </span>

        <span className="text-end">
          {stream.expectedAmount !== null ? (
            <>
              <span className="block text-sm font-semibold tabular-nums text-ink sm:text-[15px]">
                {formatMoney(shownAmount, { decimals: 0, currency: stream.currency })}
              </span>
              {deducted ? (
                <span className="block text-xs text-muted">{t('income.afterDeductions')}</span>
              ) : (
                converted !== null && (
                  <span className="block text-xs tabular-nums text-muted">{t('income.approx', { amount: formatMoney(converted, { decimals: 0, currency }) })}</span>
                )
              )}
            </>
          ) : (
            <span className="text-sm text-muted">-</span>
          )}
        </span>

        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className={`grid gap-5 border-t border-border bg-white px-4 py-5 sm:px-5 ${cutsEligible ? 'lg:grid-cols-[15rem_minmax(0,1fr)]' : ''}`}>
          <div className="flex min-w-0 flex-col gap-5">
            <dl className={`grid grid-cols-2 gap-x-4 gap-y-4 ${cutsEligible ? 'lg:grid-cols-1' : 'sm:grid-cols-3'}`}>
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

            <div className="mt-auto flex flex-wrap items-center gap-2">
              {confirming ? (
                <>
                  <span className="w-full text-sm font-medium text-ink">{t('income.deleteAsk')}</span>
                  <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">
                    {t('common.cancel')}
                  </button>
                  <button type="button" onClick={onDelete} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700">
                    <Trash2 className="h-4 w-4" /> {t('income.delete')}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={onEdit} className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium text-ink transition hover:bg-surface">
                    <Pencil className="h-4 w-4" /> {t('income.edit')}
                  </button>
                  <button type="button" onClick={() => setConfirming(true)} className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50">
                    <Trash2 className="h-4 w-4" /> {t('income.delete')}
                  </button>
                </>
              )}
            </div>
          </div>

          {cutsEligible && <SalaryCutsPanel stream={stream} onChange={onCutsChange} status={cutsStatus} />}
        </div>
      )}
    </li>
  );
}

export default IncomeRow;
