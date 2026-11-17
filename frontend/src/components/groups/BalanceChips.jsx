import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';

export default function BalanceChips({ mine }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();
  if (!mine || mine.length === 0) return <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">{t('groups.settled')}</span>;
  return (
    <>
      {mine.map((row) => (
        <span key={row.currency} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${row.amount > 0 ? 'bg-ink text-white' : 'border border-ink text-ink'}`}>
          {row.amount > 0 ? t('groups.owed', { amount: formatMoney(row.amount, { decimals: 2, currency: row.currency }) }) : t('groups.owe', { amount: formatMoney(-row.amount, { decimals: 2, currency: row.currency }) })}
        </span>
      ))}
    </>
  );
}
