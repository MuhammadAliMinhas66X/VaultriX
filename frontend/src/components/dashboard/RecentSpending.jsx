import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import Section from './Section.jsx';
import IconTile from './IconTile.jsx';
import { CategoryIcon } from '../expenses/categoryIcons.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { dateOptions } from '../../utils/dates.js';

// The last few things I paid for myself.
export default function RecentSpending({ items, byId }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  if (items.length === 0) return null;

  return (
    <Section icon={ShoppingBag} title={t('dash.recent')} to="/expenses" linkLabel={t('dashboard.viewAll')}>
      <ul className="border-t border-border">
        {items.map((expense) => {
          const category = expense.categoryId ? byId.get(expense.categoryId) : null;
          const name = category ? category.name : t('reports.uncategorised');
          return (
            <li key={expense.id} className="border-b border-border last:border-b-0">
              <Link to="/expenses" className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface/60">
                <IconTile><CategoryIcon category={category} name={name} className="h-[18px] w-[18px]" /></IconTile>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{expense.note || name}</span>
                  <span className="block truncate text-xs text-muted">{name} · {formatDate(new Date(expense.spentAt), dateOptions)}</span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-sm font-bold tabular-nums text-ink">- {formatMoney(expense.amount, { decimals: Number.isInteger(expense.amount) ? 0 : 2, currency: expense.currency })}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
