import { useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { DashboardIcon, IncomeIcon, LoansIcon, ExpenseIcon, BillsIcon, SalaryIcon, ReportsIcon } from '../icons/NavIcons.jsx';
import { ADMIN_EMAIL } from '../RequireAdmin.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useIncome } from '../../context/IncomeContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';

export default function useAppNav() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { streams } = useIncome();
  const location = useLocation();

  const onIncome = location.pathname === '/income';
  const onLoans = location.pathname === '/loans';
  const onExpenses = location.pathname === '/expenses';
  const onBills = location.pathname === '/bills';
  const onGroups = location.pathname === '/groups' || location.pathname.startsWith('/groups/');
  const onDashboard = location.pathname === '/dashboard';
  const onAdmin = location.pathname === '/admin';
  const focusedId = onIncome && location.hash.startsWith('#stream-') ? location.hash.slice('#stream-'.length) : null;
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const items = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: DashboardIcon, big: true, to: '/dashboard' },
    {
      type: 'group',
      id: 'income',
      label: t('income.headerStream'),
      icon: IncomeIcon, big: true,
      to: '/income',
      count: streams.length,
      activeChild: onIncome,
      items: [
        ...streams.map((stream) => ({
          id: `stream:${stream.id}`,
          label: stream.name,
          to: `/income#stream-${stream.id}`,
        })),
      ],
    },
    { id: 'expenses', label: t('nav.expenses'), icon: ExpenseIcon, big: true, to: '/expenses' },
    { id: 'bills', label: t('nav.bills'), icon: BillsIcon, big: true, to: '/bills' },
    { id: 'loans', label: t('nav.loans'), icon: LoansIcon, big: true, to: '/loans' },
    { id: 'salary', label: t('nav.salary'), icon: SalaryIcon, big: true, to: '/salary' },
    { id: 'reports', label: t('nav.reports'), icon: ReportsIcon, big: true, to: '/reports' },
    ...(isAdmin ? [{ id: 'admin', label: t('nav.admin'), icon: ShieldCheck, to: '/admin' }] : []),
  ];

  const onSalary = location.pathname === '/salary';
  const onReports = location.pathname === '/reports';
  const activeId = onReports ? 'reports' : onSalary ? 'salary' : onGroups ? 'dashboard' : onBills ? 'bills' : onExpenses ? 'expenses' : onLoans ? 'loans' : onDashboard ? 'dashboard' : onAdmin ? 'admin' : onIncome ? (focusedId ? `stream:${focusedId}` : 'income') : null;
  return { items, activeId };
}
