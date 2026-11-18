import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import Overview from '../components/reports/Overview.jsx';
import Budgets from '../components/reports/Budgets.jsx';
import Goals from '../components/reports/Goals.jsx';
import Accounts from '../components/reports/Accounts.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { useResource } from '../data/useResource.js';
import useExpenseCategories from '../hooks/useExpenseCategories.js';
import { monthKey, shiftMonth } from '../utils/expenseMath.js';

const TABS = ['overview', 'budgets', 'goals', 'accounts'];
const NONE = [];

export default function ReportsPage() {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const { user } = useAuth();
  const { items, activeId } = useAppNav();
  const canWrite = user?.role !== 'viewer';
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'overview';
  const nowMonth = monthKey(new Date());
  const [month, setMonth] = useState(nowMonth);
  const { categories } = useExpenseCategories();
  const expensesResource = useResource('expenses', { month });
  const expenses = expensesResource.data ? expensesResource.data.expenses : NONE;
  const expenseCategories = useMemo(() => categories.filter((item) => !item.type || item.type === 'expense'), [categories]);
  const monthLabel = formatDate(new Date(`${month}-01T00:00:00Z`), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const showMonth = tab !== 'goals' && tab !== 'accounts';

  return (
    <AppShell showLogo pageTitle={t('reports.title')} items={items} activeId={activeId}>
      <div className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('reports.title')}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">{t('reports.tagline')}</p>
          </div>
          {showMonth && (
            <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1">
              <button type="button" aria-label={t('expenses.prevMonth')} onClick={() => setMonth((value) => shiftMonth(value, -1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></button>
              <span className="min-w-[8.5rem] text-center text-sm font-semibold text-ink">{monthLabel}</span>
              <button type="button" aria-label={t('expenses.nextMonth')} disabled={month >= nowMonth} onClick={() => setMonth((value) => shiftMonth(value, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink disabled:opacity-40"><ChevronRight className="h-4 w-4 rtl:rotate-180" /></button>
            </div>
          )}
        </div>

        <div role="tablist" aria-label={t('reports.title')} className="mb-5 grid grid-cols-4 gap-1 rounded-xl border border-border bg-white p-1 sm:inline-grid sm:min-w-[28rem]">
          {TABS.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setParams(id === 'overview' ? {} : { tab: id }, { replace: true })} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${tab === id ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>
              {t(`reports.tab.${id}`)}
            </button>
          ))}
        </div>

        {tab === 'overview' && <Overview month={month} onMonth={setMonth} categories={expenseCategories} expenses={expenses} />}
        {tab === 'budgets' && <Budgets categories={expenseCategories} expenses={expenses} canWrite={canWrite} />}
        {tab === 'goals' && <Goals canWrite={canWrite} />}
        {tab === 'accounts' && <Accounts canWrite={canWrite} />}
      </div>
    </AppShell>
  );
}
