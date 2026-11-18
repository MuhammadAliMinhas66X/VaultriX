import { useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import PageHeader, { pageWidth } from '../components/PageHeader.jsx';
import MonthSwitcher from '../components/MonthSwitcher.jsx';
import Snapshot from '../components/reports/Snapshot.jsx';
import Overview from '../components/reports/Overview.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useResource } from '../data/useResource.js';
import useExpenseCategories from '../hooks/useExpenseCategories.js';
import { monthKey } from '../utils/expenseMath.js';

const NONE = [];
// Old links (`/reports?tab=goals`) still work: those tabs now have their own pages.
const MOVED = { budgets: '/budgets', goals: '/goals', accounts: '/accounts', committees: '/committees' };

// Reports = what is going on: what needs attention, how each area stands, and where the money went.
export default function ReportsPage() {
  const { t } = useTranslation();
  const { items, activeId } = useAppNav();
  const [params] = useSearchParams();
  const [month, setMonth] = useState(monthKey(new Date()));
  const { categories } = useExpenseCategories();
  const expensesResource = useResource('expenses', { month });
  const expenses = expensesResource.data ? expensesResource.data.expenses : NONE;
  const expenseCategories = useMemo(() => categories.filter((item) => !item.type || item.type === 'expense'), [categories]);
  const moved = MOVED[params.get('tab')];
  if (moved) return <Navigate to={moved} replace />;

  return (
    <AppShell showLogo pageTitle={t('reports.title')} items={items} activeId={activeId}>
      <div className={pageWidth}>
        <PageHeader title={t('reports.title')} tagline={t('reports.tagline')}>
          <MonthSwitcher month={month} onChange={setMonth} />
        </PageHeader>
        <div className="flex flex-col gap-8">
          <Snapshot expenses={expenses} categories={expenseCategories} />
          <Overview month={month} onMonth={setMonth} categories={expenseCategories} expenses={expenses} />
        </div>
      </div>
    </AppShell>
  );
}
