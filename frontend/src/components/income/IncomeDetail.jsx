import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import BrandMark from '../BrandMark.jsx';
import SalaryCutsPanel from './SalaryCutsPanel.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { amountForTotal, isDeducted, supportsCuts } from '../../utils/salaryCuts.js';
import { dateOptions } from '../../utils/dates.js';
import { typeLabelKey, frequencyLabelKey, detailKind } from './incomeOptions.js';
import ErrorSlot from '../ErrorSlot.jsx';

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

function IncomeDetail({ stream, converted, currency, onEdit, onDelete, onCutsChange, cutsStatus }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const [confirming, setConfirming] = useState(false);

  const cutsEligible = supportsCuts(stream);
  const deducted = isDeducted(stream);
  const shown = deducted ? amountForTotal(stream) : stream.expectedAmount;
  const kind = detailKind(stream.incomeType);

  const iconButton =
    'flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-muted outline-none transition hover:border-ink/30 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className="flex items-start gap-4 p-5">
        <BrandMark method={stream.destinationMethod} name={stream.destinationName} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold tracking-tight text-ink">{stream.name}</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink">{t(typeLabelKey(stream.incomeType))}</span>
            <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink">{t(frequencyLabelKey(stream.frequency))}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onEdit} title={t('income.edit')} aria-label={t('income.edit')} className={iconButton}>
            <Pencil className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            title={t('income.delete')}
            aria-label={t('income.delete')}
            className={`${iconButton} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
          >
            <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {confirming && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-y border-red-100 bg-red-50 px-5 py-3">
              <span className="me-auto text-sm font-medium text-red-700">{t('income.deleteAsk')}</span>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-surface">
                {t('common.cancel')}
              </button>
              <button type="button" onClick={onDelete} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-red-700">
                <Trash2 className="h-4 w-4" /> {t('income.delete')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ErrorSlot className="mx-5 mb-3" />

      {shown !== null && (
        <div className="mx-5 mb-1 flex items-end justify-between gap-4 rounded-xl bg-surface px-4 py-4">
          <div>
            <p className="text-xs text-muted">{t('income.expectedAmountLabel')}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">{formatMoney(shown, { decimals: 0, currency: stream.currency })}</p>
          </div>
          <p className="text-end text-xs text-muted">
            {deducted ? t('income.afterDeductions') : converted !== null ? t('income.approx', { amount: formatMoney(converted, { decimals: 0, currency }) }) : ''}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-6 p-5">
        <dl className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3">
          <Detail label={t('income.payerLabel')}>{stream.payerName || '-'}</Detail>
          <Detail label={t('income.receivedLabel')}>{formatDate(new Date(stream.receivedAt || stream.createdAt), dateOptions)}</Detail>
          {stream.typeDetail && <Detail label={t(`income.detail${kind}Label`)}>{stream.typeDetail}</Detail>}
        </dl>

        {cutsEligible && <SalaryCutsPanel stream={stream} onChange={onCutsChange} status={cutsStatus} />}
      </div>
    </div>
  );
}

export default IncomeDetail;
