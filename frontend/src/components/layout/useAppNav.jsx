import { useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { DashboardIcon, IncomeIcon, LoansIcon, ExpenseIcon, BillsIcon, SalaryIcon, GroupsNavIcon, BudgetsIcon, SavingsIcon, CommitteesIcon, AccountsIcon } from '../icons/NavIcons.jsx';
import { ADMIN_EMAIL } from '../RequireAdmin.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useIncome } from '../../context/IncomeContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useNavPrefs } from '../../hooks/useNavPrefs.js';

export default function useAppNav() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { streams } = useIncome();
  const location = useLocation();
  const prefs = useNavPrefs();

  const onIncome = location.pathname === '/income';
  const onLoans = location.pathname === '/loans';
  const onExpenses = location.pathname === '/expenses';
  const onBills = location.pathname === '/bills';
  const onGroups = location.pathname === '/groups' || location.pathname.startsWith('/groups/');
  const onDashboard = location.pathname === '/dashboard';
  const onAdmin = location.pathname === '/admin';
  const focusedId = onIncome && location.hash.startsWith('#stream-') ? location.hash.slice('#stream-'.length) : null;
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const incomeItem = {
    type: 'group',
    id: 'income',
    label: t('income.headerStream'),
    icon: IncomeIcon, big: true,
    to: '/income',
    count: streams.length,
    activeChild: onIncome,
    items: streams.map((stream) => ({ id: `stream:${stream.id}`, label: stream.name, to: `/income#stream-${stream.id}` })),
  };
  const all = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: DashboardIcon, big: true, to: '/dashboard' },
    incomeItem,
    { id: 'expenses', label: t('nav.expenses'), icon: ExpenseIcon, big: true, to: '/expenses' },
    { id: 'bills', label: t('nav.bills'), icon: BillsIcon, big: true, to: '/bills' },
    { id: 'loans', label: t('nav.loans'), icon: LoansIcon, big: true, to: '/loans' },
    { id: 'salary', label: t('nav.salary'), icon: SalaryIcon, big: true, to: '/salary' },
    { id: 'budgets', label: t('nav.budgets'), icon: BudgetsIcon, big: true, to: '/budgets' },
    { id: 'goals', label: t('nav.goals'), icon: SavingsIcon, big: true, to: '/goals' },
    { id: 'committees', label: t('nav.committees'), icon: CommitteesIcon, big: true, to: '/committees' },
    { id: 'accounts', label: t('nav.accounts'), icon: AccountsIcon, big: true, to: '/accounts' },
    { id: 'groups', label: t('groups.title'), icon: GroupsNavIcon, big: true, to: '/groups' },
  ];
  const items = [
    ...all.filter((item) => item.id === 'dashboard' || prefs[item.id]),
    ...(isAdmin ? [{ id: 'admin', label: t('nav.admin'), icon: ShieldCheck, to: '/admin' }] : []),
  ];

  const path = location.pathname;
  const section = (base) => path === base || path.startsWith(`${base}/`);
  const activeId = section('/salary') ? 'salary' : section('/budgets') ? 'budgets' : section('/goals') ? 'goals' : section('/committees') ? 'committees' : section('/accounts') ? 'accounts' : onGroups ? (prefs.groups ? 'groups' : 'dashboard') : onBills ? 'bills' : onExpenses ? 'expenses' : onLoans ? 'loans' : onDashboard ? 'dashboard' : onAdmin ? 'admin' : onIncome ? (focusedId ? `stream:${focusedId}` : 'income') : null;
  return { items, activeId };
}
