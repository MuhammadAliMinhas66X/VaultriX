import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import PageHeader, { pageWidth } from '../components/PageHeader.jsx';
import Accounts from '../components/reports/Accounts.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';

export default function AccountsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items, activeId } = useAppNav();
  return (
    <AppShell showLogo pageTitle={t('accounts.title')} items={items} activeId={activeId}>
      <div className={pageWidth}>
        <PageHeader title={t('accounts.title')} tagline={t('accounts.tagline')} />
        <Accounts canWrite={user?.role !== 'viewer'} />
      </div>
    </AppShell>
  );
}
