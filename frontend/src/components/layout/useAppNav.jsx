import { useLocation } from 'react-router-dom';
import { Handshake, HandCoins, LayoutDashboard, ShieldCheck } from 'lucide-react';
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
  const onLoans = location.pathname === '/loans';
  const focusedId = onIncome && location.hash.startsWith('#stream-') ? location.hash.slice('#stream-'.length) : null;
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const items = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, to: '/dashboard' },
    {
      type: 'group',
      id: 'income',
      label: t('income.headerStream'),
      icon: HandCoins,
      to: '/income',
      count: streams.length,
      activeChild: onIncome,
      items: [
        ...streams.map((stream) => ({
          id: `stream:${stream.id}`,
          label: stream.name,
          mark: <BrandMark method={stream.destinationMethod} name={stream.destinationName} size="sm" />,
          to: `/income#stream-${stream.id}`,
        })),
      ],
    },
    { id: 'loans', label: t('nav.loans'), icon: Handshake, to: '/loans' },
    ...(isAdmin ? [{ id: 'admin', label: t('nav.admin'), icon: ShieldCheck, to: '/admin' }] : []),
  ];

  const activeId = onLoans ? 'loans' : !onIncome ? 'dashboard' : focusedId ? `stream:${focusedId}` : 'income';
  return { items, activeId };
}
