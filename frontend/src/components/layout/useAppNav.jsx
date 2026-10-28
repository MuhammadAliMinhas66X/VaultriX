import { useLocation } from 'react-router-dom';
import { Banknote, LayoutDashboard, List, Plus, ShieldCheck } from 'lucide-react';
import BrandMark from '../BrandMark.jsx';
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
  const focusedId = onIncome && location.hash.startsWith('#stream-') ? location.hash.slice('#stream-'.length) : null;
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const items = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, to: '/dashboard' },
    {
      type: 'group',
      id: 'income',
      label: t('income.headerStream'),
      icon: Banknote,
      count: streams.length,
      activeChild: onIncome,
      items: [
        { id: 'income-all', label: t('income.all'), icon: List, to: '/income' },
        { id: 'income-add', label: t('income.add'), icon: Plus, to: '/income?add=1' },
        ...streams.map((stream) => ({
          id: `stream:${stream.id}`,
          label: stream.name,
          mark: <BrandMark method={stream.destinationMethod} name={stream.destinationName} size="sm" />,
          to: `/income#stream-${stream.id}`,
        })),
      ],
    },
    ...(isAdmin ? [{ id: 'admin', label: t('nav.admin'), icon: ShieldCheck, to: '/admin' }] : []),
  ];

  const activeId = !onIncome ? 'dashboard' : focusedId ? `stream:${focusedId}` : 'income-all';
  return { items, activeId };
}
