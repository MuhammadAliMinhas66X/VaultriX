import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import PageHeader, { pageWidth } from '../components/PageHeader.jsx';
import Goals from '../components/reports/Goals.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';

export default function GoalsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items, activeId } = useAppNav();
  return (
    <AppShell showLogo pageTitle={t('goals.title')} items={items} activeId={activeId}>
      <div className={pageWidth}>
        <PageHeader title={t('goals.title')} tagline={t('goals.tagline')} />
        <Goals canWrite={user?.role !== 'viewer'} />
      </div>
    </AppShell>
  );
}
