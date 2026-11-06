import { Check, Repeat } from 'lucide-react';
import BrandMark from '../BrandMark.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { dateOptions } from '../../utils/dates.js';
import { billStatus, dueNote } from '../../utils/billMath.js';

// One bill in the list. The whole row opens the bill; "Pay" is its own button
// sitting above the row so the two never nest.
function BillRow({ bill, today, categoryName, onSelect, onPay }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const status = billStatus(bill, today);
  const closed = status === 'paid' || status === 'cancelled';
  const payable = !closed;
  const note = dueNote(bill, today);
  const shown = closed ? bill.total : bill.remaining;
  const progress = bill.total > 0 ? Math.min(100, (bill.paid / bill.total) * 100) : 0;
  const noteText = t(note.key, { count: note.count, date: note.date ? formatDate(new Date(`${note.date}T00:00:00Z`), { ...dateOptions, timeZone: 'UTC' }) : '' });

  return (
    <div className={`group relative flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface/70 sm:gap-4 sm:px-5 ${status === 'cancelled' ? 'opacity-60' : ''}`}>
      <button type="button" onClick={onSelect} aria-label={bill.billerName} className="absolute inset-0 z-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40" />

      <span className="pointer-events-none relative z-[1] shrink-0">
        <BrandMark method="biller" name={bill.billerName} />
      </span>

      <span className="pointer-events-none relative z-[1] flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-baseline justify-between gap-3">
          <span className="truncate text-[15px] font-semibold text-ink">{bill.billerName}</span>
          <span className={`shrink-0 text-[15px] font-semibold tabular-nums ${closed ? 'text-muted' : 'text-ink'} ${status === 'cancelled' ? 'line-through' : ''}`}>
            {formatMoney(shown, { decimals: 2, currency: bill.currency })}
          </span>
        </span>

        <span className="flex min-w-0 items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
            {status === 'paid' && <Check className="h-3.5 w-3.5 shrink-0 text-ink" strokeWidth={2.5} />}
            <span className={`truncate ${note.strong ? 'font-semibold text-ink' : ''}`}>{noteText}</span>
            {categoryName && <span className="hidden truncate sm:inline">· {categoryName}</span>}
            {bill.frequency !== 'none' && (
              <Repeat className={`h-3.5 w-3.5 shrink-0 ${bill.seriesState === 'paused' ? 'opacity-40' : ''}`} strokeWidth={2} aria-label={t('bills.repeatLabel')} />
            )}
          </span>
          {payable && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onPay();
              }}
              className="pointer-events-auto relative z-[2] shrink-0 rounded-full bg-ink px-3.5 py-1 text-xs font-semibold text-white outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-95"
            >
              {t('bills.payShort')}
            </button>
          )}
        </span>

        {status === 'partial' && (
          <span className="mt-0.5 flex items-center gap-2.5">
            <span className="block h-1 flex-1 overflow-hidden rounded-full bg-border/70">
              <span style={{ width: `${progress}%` }} className="block h-full rounded-full bg-ink transition-[width] duration-700" />
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted">{formatMoney(bill.paid, { decimals: 0, currency: bill.currency })} / {formatMoney(bill.total, { decimals: 0, currency: bill.currency })}</span>
          </span>
        )}
      </span>
    </div>
  );
}

export default BillRow;
