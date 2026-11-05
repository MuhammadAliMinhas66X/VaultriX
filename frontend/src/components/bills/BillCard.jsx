import { Repeat } from 'lucide-react';
import BrandMark from '../BrandMark.jsx';
import { CategoryIcon } from '../expenses/categoryIcons.jsx';
import { StatusBadge, FREQUENCY_KEY } from './BillStatus.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { dateOptions } from '../../utils/dates.js';
import { billStatus, isPastDue } from '../../utils/billMath.js';

function BillCard({ bill, today, category, categoryName, onSelect }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const status = billStatus(bill, today);
  const open = status !== 'paid' && status !== 'cancelled';
  const shown = open ? bill.remaining : bill.total;
  const partial = status === 'partial';
  const progress = bill.total > 0 ? Math.min(100, (bill.paid / bill.total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full min-w-0 flex-col gap-3.5 rounded-2xl border border-border bg-white p-4 text-start outline-none transition-[transform,box-shadow,border-color] active:scale-[0.985] hover:border-ink/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <span className="flex min-w-0 items-start gap-3.5">
        <BrandMark method="biller" name={bill.billerName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink">{bill.billerName}</span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted">
            <CategoryIcon category={category} name={categoryName} className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{categoryName}</span>
          </span>
        </span>
        <span className="shrink-0 text-end">
          <span className="block text-base font-semibold tabular-nums text-ink">{formatMoney(shown, { decimals: 2, currency: bill.currency })}</span>
          <span className="block text-xs text-muted">{open ? t('bills.remaining') : t('bills.total')}</span>
        </span>
      </span>

      {partial && (
        <span className="block h-1.5 w-full overflow-hidden rounded-full bg-border/70">
          <span style={{ width: `${progress}%` }} className="block h-full rounded-full bg-ink transition-[width] duration-500" />
        </span>
      )}

      <span className="flex flex-wrap items-center gap-2 text-xs">
        <StatusBadge status={status} pastDue={isPastDue(bill, today)} />
        <span className="rounded-full bg-surface px-2.5 py-1 font-medium text-muted">{t('bills.dueOn', { date: formatDate(new Date(bill.dueAt), dateOptions) })}</span>
        {bill.frequency !== 'none' && (
          <span className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 font-medium text-muted">
            <Repeat className="h-3 w-3" strokeWidth={2} />
            {t(FREQUENCY_KEY[bill.frequency])}
            {bill.seriesState === 'paused' ? ` · ${t('bills.paused')}` : ''}
          </span>
        )}
      </span>
    </button>
  );
}

export default BillCard;
