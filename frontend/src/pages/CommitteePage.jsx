import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import { pageWidth } from '../components/PageHeader.jsx';
import CommitteeForm from '../components/committees/CommitteeForm.jsx';
import CommitteeDetail from '../components/committees/CommitteeDetail.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useResource } from '../data/useResource.js';
import { useAppReducedMotion } from '../hooks/useMotionPreference.js';
import { localDay } from '../utils/committeeMath.js';

// One committee in full: your side, the organizer's side, who paid which round, and who wins each round.
export default function CommitteePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user, currency } = useAuth();
  const { items, activeId } = useAppNav();
  const calm = useAppReducedMotion();
  const canWrite = user?.role !== 'viewer';
  const resource = useResource('committees', { today: localDay() });
  const committee = resource.data ? resource.data.committees.find((item) => item.id === id) : null;
  const [editing, setEditing] = useState(false);

  return (
    <AppShell showLogo pageTitle={committee ? committee.name : t('committees.title')} items={items} activeId={activeId}>
      <div className={pageWidth}>
        <Link to="/committees" className="-ms-2 mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted outline-none transition hover:bg-black/[0.04] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />{t('committees.title')}
        </Link>
        {resource.loading ? (
          <div className="h-64 animate-pulse rounded-xl border border-border bg-white" aria-hidden="true" />
        ) : !committee ? (
          <p className="rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center text-sm text-muted">{t('committees.notFound')}</p>
        ) : editing ? (
          <CommitteeForm committee={committee} currency={currency} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
        ) : (
          <CommitteeDetail committee={committee} canWrite={canWrite} calm={calm} onEdit={() => setEditing(true)} />
        )}
      </div>
    </AppShell>
  );
}
