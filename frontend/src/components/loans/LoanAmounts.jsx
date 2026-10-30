import { useTranslation } from '../../i18n/useTranslation.js';

function LoanAmounts({ total, paid, left, leftLabel, money, size = 'lg' }) {
  const { t } = useTranslation();
  const done = total > 0 && left <= 0;
  const progress = total > 0 ? Math.min(1, paid / total) : 0;
  const figure = size === 'lg' ? 'text-3xl' : 'text-2xl';

  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted">{done ? t('loans.statTotal') : leftLabel}</p>
      <p className={`mt-1 truncate font-semibold tabular-nums tracking-tight text-ink ${figure}`}>{money(done ? total : left)}</p>
      {paid > 0 && !done && (
        <div className="mt-3">
          <div role="img" aria-label={t('loans.paidOf', { paid: money(paid), total: money(total) })} className="h-1.5 w-full overflow-hidden rounded-full bg-border/70">
            <div style={{ width: `${progress * 100}%` }} className="h-full rounded-full bg-ink transition-[width] duration-500" />
          </div>
          <p className="mt-2 text-xs tabular-nums text-muted">{t('loans.paidOf', { paid: money(paid), total: money(total) })}</p>
        </div>
      )}
    </div>
  );
}

export default LoanAmounts;
