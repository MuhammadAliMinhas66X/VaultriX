import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Check, ChevronRight, Receipt, Target } from 'lucide-react';
import Section from './Section.jsx';
import IconTile from './IconTile.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';

const ICONS = { bill: Receipt, loanOwe: ArrowUpRight, loanOwed: ArrowDownLeft, budgetOver: Target, budgetWarn: Target, overspent: AlertTriangle };

function Pill({ children, hot }) {
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${hot ? 'bg-ink text-white' : 'bg-surface text-muted'}`}>{children}</span>;
}

// Everything that needs a decision today, in one list: overdue and soon-due bills and loans,
// budgets that are nearly or already used up, and a month that is spent past its income.
export default function AttentionPanel({ items, nameOf, currency }) {
  const { t } = useTranslation();
  const { formatMoney, formatNumber } = useFormat();
  const money = (value, code = currency) => formatMoney(value, { decimals: 0, currency: code });

  const dueLabel = (days) => (days < 0 ? t('reminders.overdue', { count: Math.abs(days) }) : days === 0 ? t('reminders.today') : t('reminders.inDays', { count: days }));

  const describe = (item) => {
    if (item.kind === 'overspent') return { title: t('balance.overspentMonth', { amount: money(item.amount) }), sub: t('nav.expenses'), right: null, pill: null, hot: true };
    if (item.kind === 'budgetOver' || item.kind === 'budgetWarn') {
      const over = item.kind === 'budgetOver';
      return {
        title: nameOf(item.categoryId),
        sub: over ? t('dash.budgetOverBy', { amount: money(item.amount) }) : t('dash.budgetLeft', { amount: money(item.amount) }),
        right: null,
        pill: `${formatNumber(Math.round(item.ratio * 100))}%`,
        hot: over,
      };
    }
    const sub = item.kind === 'bill' ? t('reminders.kindBill') : item.kind === 'loanOwe' ? t('reminders.kindOwe') : t('reminders.kindOwed');
    return { title: item.name, sub, right: money(item.amount, item.currency), pill: dueLabel(item.days), hot: item.days <= 0 };
  };

  return (
    <Section icon={AlertTriangle} title={t('dash.attention')}>
      {items.length === 0 ? (
        <p className="mx-5 mb-5 flex items-center gap-3 rounded-xl bg-surface px-4 py-3.5 text-sm text-muted">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-border"><Check className="h-4 w-4" strokeWidth={2} /></span>
          {t('dash.allClear')}
        </p>
      ) : (
        <ul className="border-t border-border">
          {items.map((item) => {
            const row = describe(item);
            const Icon = ICONS[item.kind] || AlertTriangle;
            return (
              <li key={item.key} className="border-b border-border last:border-b-0">
                <Link to={item.href} className="group flex min-w-0 items-center gap-3 px-5 py-3 outline-none transition hover:bg-surface/60 focus-visible:bg-surface/60">
                  <IconTile icon={Icon} variant={row.hot ? 'ink' : 'soft'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{row.title}</span>
                    <span className="block truncate text-xs text-muted">{row.sub}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {row.right && <span className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{row.right}</span>}
                    {row.pill && <Pill hot={row.hot}>{row.pill}</Pill>}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink rtl:rotate-180" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
