import { useState } from 'react';
import { AlertCircle, Plus, Users } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import PageHeader, { pageWidth } from '../components/PageHeader.jsx';
import CommitteeForm from '../components/committees/CommitteeForm.jsx';
import CommitteeCard from '../components/committees/CommitteeCard.jsx';
import { btn } from '../components/salary/ui.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useResource } from '../data/useResource.js';
import { useAppReducedMotion } from '../hooks/useMotionPreference.js';
import { localDay } from '../utils/committeeMath.js';

const NONE = [];

export default function CommitteesPage() {
  const { t } = useTranslation();
  const { user, currency } = useAuth();
  const { items, activeId } = useAppNav();
  const calm = useAppReducedMotion();
  const canWrite = user?.role !== 'viewer';
  const resource = useResource('committees', { today: localDay() });
  const committees = resource.data ? resource.data.committees : NONE;
  const [form, setForm] = useState(false);
  const dueCount = committees.reduce((sum, item) => sum + item.rounds.filter((round) => round.status === 'overdue' || round.status === 'due').length, 0);
  const lateCount = committees.reduce((sum, item) => sum + (item.lateMembers || 0), 0);

  return (
    <AppShell showLogo pageTitle={t('committees.title')} items={items} activeId={activeId}>
      <div className={pageWidth}>
        <PageHeader title={t('committees.title')} tagline={t('committees.tagline')}>
          {canWrite && !form && <button type="button" onClick={() => setForm(true)} className={btn.primary}><Plus className="h-4 w-4" />{t('committees.add')}</button>}
        </PageHeader>

        {form ? (
          <CommitteeForm committee={null} currency={currency} onDone={() => setForm(false)} onCancel={() => setForm(false)} />
        ) : (
          <div className="flex flex-col gap-4">
            {(dueCount > 0 || lateCount > 0) && (
              <p role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-ink">
                <span className="inline-flex items-center gap-2"><AlertCircle className="h-4 w-4" />{[dueCount > 0 ? t('committees.dueSummary', { count: dueCount }) : null, lateCount > 0 ? t('committees.lateSummary', { count: lateCount }) : null].filter(Boolean).join(' · ')}</span>
              </p>
            )}
            {resource.loading ? (
              <div className="h-44 animate-pulse rounded-xl border border-border bg-white" aria-hidden="true" />
            ) : committees.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted"><Users className="h-5 w-5" strokeWidth={1.5} /></span>
                <p className="mt-4 text-base font-medium text-ink">{t('committees.emptyTitle')}</p>
                <p className="mt-1.5 max-w-md text-sm text-muted">{t('committees.emptyText')}</p>
                {canWrite && <button type="button" onClick={() => setForm(true)} className={`${btn.primary} mt-5`}><Plus className="h-4 w-4" />{t('committees.add')}</button>}
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {committees.map((item) => <CommitteeCard key={item.id} committee={item} canWrite={canWrite} calm={calm} />)}
              </ul>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
