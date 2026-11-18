import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, CheckCircle2, Gauge, HandCoins, Landmark, Target } from 'lucide-react';
import { iconOf, reminderLabel } from '../layout/NotificationsBell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useIncome } from '../../context/IncomeContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { useResource } from '../../data/useResource.js';
import { useReminders } from '../../hooks/useReminders.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { budgetRows, budgetTotals, goalProgress } from '../../utils/reportMath.js';
import { convert } from '../../utils/balanceMath.js';
import { todayInput } from '../../utils/dates.js';
import { localDay } from '../../utils/committeeMath.js';

const NONE = [];
const card = 'rounded-2xl border border-border bg-white p-4 sm:p-5';

function Bar({ ratio, calm, warn }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60" aria-hidden="true">
      <motion.div initial={calm ? false : { width: 0 }} animate={{ width: `${Math.min(1, Math.max(0, ratio)) * 100}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className={`h-full rounded-full ${warn ? 'bg-red-600' : 'bg-ink'}`} />
    </div>
  );
}

// A small card that links to the page it summarises.
function Tile({ to, icon: Icon, title, children }) {
  return (
    <Link to={to} className={`${card} group flex flex-col gap-3 outline-none transition hover:border-ink/25 focus-visible:ring-2 focus-visible:ring-accent/40`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink"><Icon className="h-4 w-4 text-muted" strokeWidth={1.75} />{title}</span>
        <ArrowUpRight className="h-4 w-4 text-muted transition group-hover:text-ink rtl:-scale-x-100" aria-hidden="true" />
      </div>
      {children}
    </Link>
  );
}

// "What is going on" right now: what needs attention, then one card per area (budgets, goals,
// accounts, committees). Everything comes from the same data the pages use.
export default function Snapshot({ expenses, categories }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const day = (value) => formatDate(new Date(`${value}T00:00:00Z`), { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const { currency } = useAuth();
  const { rates } = useIncome();
  const calm = useAppReducedMotion();
  const today = todayInput();
  const { items: reminders } = useReminders();
  const budgetsResource = useResource('budgets');
  const goalsResource = useResource('goals');
  const accountsResource = useResource('accounts', { archived: '0' });
  const committeesResource = useResource('committees', { today: localDay() });
  const budgets = budgetsResource.data ? budgetsResource.data.budgets : NONE;
  const goals = goalsResource.data ? goalsResource.data.goals : NONE;
  const accounts = accountsResource.data ? accountsResource.data.accounts : NONE;
  const committees = committeesResource.data ? committeesResource.data.committees : NONE;

  const rows = useMemo(() => (rates ? budgetRows(budgets, expenses, rates, currency) : NONE), [budgets, expenses, rates, currency]);
  const totals = budgetTotals(rows);
  const names = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);
  const over = rows.filter((row) => row.status === 'over');
  const close = rows.filter((row) => row.status === 'warn');
  const goalRows = useMemo(() => goals.map((goal) => ({ goal, progress: goalProgress(goal, today) })), [goals, today]);
  const goalsLate = goalRows.filter((row) => row.progress.overdue);
  const goalsDone = goalRows.filter((row) => row.progress.done).length;
  const goalsOpen = goalRows.filter((row) => !row.progress.done).sort((a, b) => b.progress.ratio - a.progress.ratio).slice(0, 2);
  const accountTotal = useMemo(() => (rates ? accounts.reduce((sum, account) => sum + (convert(account.balance, account.currency, rates, currency) || 0), 0) : null), [accounts, rates, currency]);
  const activeCommittees = committees.filter((item) => !item.finished);
  const nextCommittee = activeCommittees.filter((item) => item.next).sort((a, b) => a.next.due.localeCompare(b.next.due))[0];
  const nextPayout = activeCommittees.filter((item) => item.payoutDay && item.payoutStatus !== 'received').sort((a, b) => a.payoutDay.localeCompare(b.payoutDay))[0];

  const attention = [
    ...reminders.slice(0, 6).map((item) => ({ key: item.key, to: item.href, icon: iconOf[item.kind], title: item.name, text: reminderLabel(item, t), amount: formatMoney(item.amount, { decimals: 0, currency: item.currency }), urgent: item.days < 0 })),
    ...over.map((row) => ({ key: `budget-${row.categoryId}`, to: '/budgets', icon: Gauge, title: names.get(row.categoryId) || t('reports.uncategorised'), text: t('reports.over', { amount: formatMoney(Math.abs(row.left), { currency, decimals: 0 }) }), amount: '', urgent: true })),
    ...goalsLate.map((row) => ({ key: `goal-${row.goal.id}`, to: '/goals', icon: Target, title: row.goal.name, text: t('reports.goalOverdue'), amount: formatMoney(row.progress.left, { currency: row.goal.currency, decimals: 0 }), urgent: true })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className={card} aria-label={t('reports.attention')}>
        <h2 className="text-base font-semibold text-ink">{t('reports.attention')}</h2>
        {attention.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted"><CheckCircle2 className="h-4 w-4 text-ink" strokeWidth={1.75} />{t('reports.allGood')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {attention.map((row) => {
              const Icon = row.icon;
              return (
                <li key={row.key}>
                  <Link to={row.to} className="flex items-center gap-3 py-2.5 outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent/40">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink"><Icon className="h-4 w-4" strokeWidth={1.75} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{row.title}</span>
                      <span className={`block truncate text-xs ${row.urgent ? 'font-semibold text-ink' : 'text-muted'}`}>{row.text}</span>
                    </span>
                    {row.amount && <span className="shrink-0 whitespace-nowrap text-sm font-bold tabular-nums text-ink">{row.amount}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Tile to="/budgets" icon={Gauge} title={t('nav.budgets')}>
          {rows.length === 0 ? (
            <p className="text-sm text-muted">{t('reports.noBudgets')}</p>
          ) : (
            <>
              <p className="whitespace-nowrap text-lg font-semibold tabular-nums text-ink">{formatMoney(totals.spent, { currency, decimals: 0 })} <span className="text-sm font-normal text-muted">/ {formatMoney(totals.limit, { currency, decimals: 0 })}</span></p>
              <Bar ratio={totals.ratio} calm={calm} warn={totals.ratio > 1} />
              <p className="text-xs text-muted">{over.length > 0 ? t('reports.budgetsOver', { count: over.length }) : close.length > 0 ? t('reports.budgetsClose', { count: close.length }) : t('reports.budgetsOk')}</p>
            </>
          )}
        </Tile>

        <Tile to="/goals" icon={Target} title={t('nav.goals')}>
          {goalRows.length === 0 ? (
            <p className="text-sm text-muted">{t('reports.noGoals')}</p>
          ) : (
            <>
              {goalsOpen.length === 0 && <p className="text-sm font-medium text-ink">{t('reports.goalsAllDone')}</p>}
              {goalsOpen.map(({ goal, progress }) => (
                <div key={goal.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-ink">{goal.name}</span>
                    <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted">{Math.round(progress.ratio * 100)}%</span>
                  </div>
                  <Bar ratio={progress.ratio} calm={calm} />
                </div>
              ))}
              <p className="text-xs text-muted">{t('reports.goalsSummary', { done: goalsDone, total: goalRows.length })}</p>
            </>
          )}
        </Tile>

        <Tile to="/accounts" icon={Landmark} title={t('nav.accounts')}>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted">{t('accounts.empty')}</p>
          ) : (
            <>
              <p className={`whitespace-nowrap text-lg font-semibold tabular-nums ${accountTotal !== null && accountTotal < 0 ? 'text-red-600' : 'text-ink'}`}>{accountTotal === null ? '…' : formatMoney(accountTotal, { currency, decimals: 0 })}</p>
              <p className="text-xs text-muted">{t('reports.accountsCount', { count: accounts.length })}</p>
            </>
          )}
        </Tile>

        <Tile to="/committees" icon={HandCoins} title={t('nav.committees')}>
          {activeCommittees.length === 0 ? (
            <p className="text-sm text-muted">{t('committees.emptyTitle')}</p>
          ) : (
            <>
              {nextCommittee && <p className="text-sm text-ink"><span className="font-semibold">{nextCommittee.name}</span> · <span className="whitespace-nowrap tabular-nums">{formatMoney(nextCommittee.contribution, { currency: nextCommittee.currency, decimals: 0 })}</span> <span className="text-muted">· {day(nextCommittee.next.due)}</span></p>}
              {nextPayout && <p className="text-xs text-muted">{t('reports.committeePayout', { name: nextPayout.name, date: day(nextPayout.payoutDay) })}</p>}
              <p className="text-xs text-muted">{t('reports.committeesActive', { count: activeCommittees.length })}</p>
            </>
          )}
        </Tile>
      </div>
    </div>
  );
}
