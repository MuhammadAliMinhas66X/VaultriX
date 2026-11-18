import { useMemo, useState } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import PageHeader, { pageWidth } from '../components/PageHeader.jsx';
import MonthSwitcher from '../components/MonthSwitcher.jsx';
import Budgets from '../components/reports/Budgets.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useResource } from '../data/useResource.js';
import useExpenseCategories from '../hooks/useExpenseCategories.js';
import { monthKey } from '../utils/expenseMath.js';

const NONE = [];

export default function BudgetsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items, activeId } = useAppNav();
  const [month, setMonth] = useState(monthKey(new Date()));
  const { categories } = useExpenseCategories();
  const expensesResource = useResource('expenses', { month });
  const expenses = expensesResource.data ? expensesResource.data.expenses : NONE;
  const expenseCategories = useMemo(() => categories.filter((item) => !item.type || item.type === 'expense'), [categories]);

  return (
    <AppShell showLogo pageTitle={t('budgets.title')} items={items} activeId={activeId}>
      <div className={pageWidth}>
        <PageHeader title={t('budgets.title')} tagline={t('budgets.tagline')}>
          <MonthSwitcher month={month} onChange={setMonth} />
        </PageHeader>
        <Budgets categories={expenseCategories} expenses={expenses} canWrite={user?.role !== 'viewer'} />
      </div>
    </AppShell>
  );
}
