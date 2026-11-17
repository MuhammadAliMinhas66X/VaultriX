import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import GroupsHub from '../components/groups/GroupsHub.jsx';
import { useTranslation } from '../i18n/useTranslation.js';

export { default as BalanceChips } from '../components/groups/BalanceChips.jsx';

export default function GroupsPage() {
  const { t } = useTranslation();
  const { items, activeId } = useAppNav();
  return (
    <AppShell showLogo pageTitle={t('groups.title')} items={items} activeId={activeId}>
      <div className="mx-auto w-full max-w-[880px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <GroupsHub full />
      </div>
    </AppShell>
  );
}
