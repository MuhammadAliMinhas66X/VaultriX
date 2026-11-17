import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import GroupsIcon from '../components/groups/GroupsIcon.jsx';
import { InviteRow } from '../components/groups/GroupsHub.jsx';
import { useGroupInvites } from '../hooks/useGroupInvites.js';
import { useTranslation } from '../i18n/useTranslation.js';

// Where the "Join group" button in the invitation email lands. Signed-out people
// are sent to login or signup first and come back here (see utils/returnPath.js).
export default function JoinGroupPage() {
  const { t } = useTranslation();
  const { items, activeId } = useAppNav();
  const { invites, ready, refresh } = useGroupInvites();
  return (
    <AppShell showLogo pageTitle={t('groups.joinPageTitle')} items={items} activeId={activeId}>
      <div className="mx-auto w-full max-w-[560px] px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-6 flex items-center gap-4">
          <GroupsIcon />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('groups.joinPageTitle')}</h1>
            <p className="mt-0.5 text-sm text-muted">{t('groups.tagline')}</p>
          </div>
        </div>
        {!ready ? (
          <div className="flex justify-center py-12 text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : invites.length > 0 ? (
          <ul className="flex flex-col gap-3">{invites.map((invite) => <InviteRow key={invite.id} invite={invite} onDone={refresh} />)}</ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center">
            <p className="text-base font-semibold text-ink">{t('groups.noInvitesTitle')}</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{t('groups.noInvitesBody')}</p>
            <Link to="/dashboard#groups" className="mt-5 inline-flex rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">{t('groups.openGroups')}</Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
