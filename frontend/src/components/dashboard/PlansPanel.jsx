import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import Section from './Section.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { goalProgress } from '../../utils/reportMath.js';

function Bar({ ratio, over }) {
  return (
    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-border/70">
      <span style={{ width: `${Math.max(2, Math.min(1, ratio) * 100)}%` }} className={`block h-full rounded-full ${over ? 'bg-red-600' : 'bg-ink'}`} />
    </span>
  );
}

function Heading({ children, to }) {
  return (
    <Link to={to} className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted transition hover:text-ink">{children}</Link>
  );
}

// Budgets (closest to their limit first) and goals (closest to done first), three of each.
export default function PlansPanel({ budgets, goals, nameOf, today, currency }) {
  const { t } = useTranslation();
  const { formatMoney, formatNumber } = useFormat();
  const money = (value, code = currency) => formatMoney(value, { decimals: 0, currency: code });

  const shownBudgets = budgets.slice(0, 3);
  const shownGoals = goals
    .map((goal) => ({ goal, progress: goalProgress(goal, today) }))
    .filter((row) => !row.progress.done)
    .sort((a, b) => b.progress.ratio - a.progress.ratio)
    .slice(0, 3);

  if (shownBudgets.length === 0 && shownGoals.length === 0) return null;

  return (
    <Section icon={Target} title={t('dash.plansTitle')} to="/budgets" linkLabel={t('nav.budgets')}>
      <div className="flex flex-col gap-5 px-5 pb-5">
        {shownBudgets.length > 0 && (
          <div>
            <Heading to="/budgets">{t('nav.budgets')}</Heading>
            <ul className="flex flex-col gap-3.5">
              {shownBudgets.map((row) => (
                <li key={row.id || row.categoryId}>
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-semibold text-ink">{nameOf(row.categoryId)}</span>
                    <span className="whitespace-nowrap text-xs tabular-nums text-muted"><span className="font-semibold text-ink">{money(row.spent)}</span> / {money(row.limit)}</span>
                  </span>
                  <Bar ratio={row.ratio} over={row.status === 'over'} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {shownGoals.length > 0 && (
          <div>
            <Heading to="/goals">{t('nav.goals')}</Heading>
            <ul className="flex flex-col gap-3.5">
              {shownGoals.map(({ goal, progress }) => (
                <li key={goal.id}>
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-semibold text-ink">{goal.name}</span>
                    <span className="whitespace-nowrap text-xs tabular-nums text-muted"><span className="font-semibold text-ink">{money(goal.saved, goal.currency)}</span> / {money(goal.target, goal.currency)}</span>
                  </span>
                  <Bar ratio={progress.ratio} />
                  <span className="mt-1 flex items-center justify-between gap-3 text-xs text-muted">
                    <span className="tabular-nums">{formatNumber(Math.round(progress.ratio * 100))}%</span>
                    {progress.perMonth !== null && <span className="whitespace-nowrap tabular-nums">{t('dash.goalPerMonth', { amount: money(progress.perMonth, goal.currency) })}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}
