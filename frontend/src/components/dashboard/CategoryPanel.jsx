import { PieChart } from 'lucide-react';
import Section from './Section.jsx';
import IconTile from './IconTile.jsx';
import { CategoryIcon } from '../expenses/categoryIcons.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';

// Where this month's own spending went. Rows with a budget show how much of it is left.
export default function CategoryPanel({ rows, byId, budgetByCategory, currency }) {
  const { t } = useTranslation();
  const { formatMoney, formatNumber } = useFormat();
  const money = (value) => formatMoney(value, { decimals: 0, currency });
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <Section icon={PieChart} title={t('dash.categories')} to="/expenses" linkLabel={t('nav.expenses')}>
      {rows.length === 0 ? (
        <p className="mx-5 mb-5 rounded-xl bg-surface px-4 py-3.5 text-sm text-muted">{t('dash.noSpendingMonth')}</p>
      ) : (
        <ul className="flex flex-col gap-4 px-5 pb-5">
          {rows.map((row, index) => {
            const category = row.key === 'none' ? null : byId.get(row.key);
            const name = category ? category.name : t('reports.uncategorised');
            const budget = row.key === 'none' ? null : budgetByCategory.get(row.key);
            const share = total > 0 ? row.value / total : 0;
            return (
              <li key={row.key} className="flex items-center gap-3">
                <IconTile><CategoryIcon category={category} name={name} className="h-[18px] w-[18px]" /></IconTile>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold text-ink">{name}</span>
                    <span className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{money(row.value)}</span>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-border/70">
                    <span style={{ width: `${Math.max(2, share * 100)}%`, opacity: Math.max(0.35, 1 - index * 0.14) }} className="block h-full rounded-full bg-ink" />
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-3 text-xs text-muted">
                    <span className="tabular-nums">{formatNumber(Math.round(share * 100))}%</span>
                    {budget && <span className={`whitespace-nowrap tabular-nums ${budget.status === 'over' ? 'font-semibold text-red-600' : ''}`}>{budget.status === 'over' ? t('dash.budgetOverBy', { amount: money(-budget.left) }) : t('dash.budgetLeft', { amount: money(budget.left) })}</span>}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
