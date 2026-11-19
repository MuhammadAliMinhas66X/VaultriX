import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, Users } from 'lucide-react';
import { btn, card } from '../salary/ui.js';
import { pad, dayDate, shortDateOptions, RoundDots, StatusChip, RoleChip, ProgressBar, PayoutChip } from './parts.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { notify } from '../../i18n/notifications.js';
import { localDay } from '../../utils/committeeMath.js';
import { payRound } from '../../services/committeeService.js';

// One committee in the list. The whole title is the link; "Mark paid" is its own button.
export default function CommitteeCard({ committee, canWrite, calm }) {
  const { t, tServer } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const [busy, setBusy] = useState(false);
  const money = (value) => formatMoney(value, { currency: committee.currency, decimals: 0, maxDecimals: 2 });
  const shortDate = (day) => formatDate(dayDate(day), shortDateOptions);
  const organizer = committee.role === 'organizer';
  const payoutLabel = { received: t('committees.payoutReceived', { date: committee.payoutReceivedAt ? shortDate(committee.payoutReceivedAt) : '' }), ready: t('committees.payoutReady'), upcoming: t('committees.payoutUpcoming'), undrawn: t('committees.payoutUndrawn') }[committee.payoutStatus];

  const pay = async () => {
    setBusy(true);
    try {
      await payRound(committee.id, committee.next.round, localDay());
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`${card} ${pad} relative transition hover:border-ink/25`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-semibold text-ink">
              <Link to={`/committees/${committee.id}`} className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-accent/40">{committee.name}</Link>
            </h3>
            <RoleChip role={committee.role} />
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{t('committees.membersCount', { count: committee.size })}</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap tabular-nums">{t(committee.frequency === 'daily' ? 'committees.perDay' : committee.frequency === 'weekly' ? 'committees.perWeek' : 'committees.perMonth', { amount: money(committee.contribution) })}</span>
          </p>
        </div>
        {committee.finished ? (
          <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-ink px-2.5 text-xs font-medium text-white"><Check className="h-3 w-3" />{t('committees.finished')}</span>
        ) : (
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted rtl:rotate-180" aria-hidden="true" />
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted">{t('committees.progress', { paid: committee.paidCount, total: committee.size })}</span>
          <span className="whitespace-nowrap font-semibold tabular-nums text-ink">{money(committee.paid)} <span className="font-normal text-muted">/ {money(committee.total)}</span></span>
        </div>
        <div className="mt-2"><ProgressBar ratio={committee.total > 0 ? committee.paid / committee.total : 0} calm={calm} label={t('committees.progress', { paid: committee.paidCount, total: committee.size })} /></div>
        <div className="mt-3"><RoundDots rounds={committee.rounds} calm={calm} /></div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-3.5 text-sm">
        {committee.next ? (
          <p className="flex min-w-0 flex-wrap items-center gap-2 text-muted">
            <span className="font-medium text-ink">{t('committees.nextPayment')}</span>
            <span className="whitespace-nowrap tabular-nums">{money(committee.contribution)} · {shortDate(committee.next.due)}</span>
            <StatusChip status={committee.next.status} />
          </p>
        ) : (
          <p className="font-medium text-ink">{t('committees.allPaid')}</p>
        )}
        <span className="relative z-10 flex items-center gap-2">
          {canWrite && committee.next && <button type="button" disabled={busy} onClick={pay} className={btn.secondary}><Check className="h-4 w-4" />{t('committees.payNow')}</button>}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
        <span className="inline-flex items-center gap-2">{t('committees.yourPayout')}: <span className="font-semibold tabular-nums text-ink">{money(committee.payout)}</span> <PayoutChip status={committee.payoutStatus} label={payoutLabel} /></span>
        {organizer && committee.lateMembers > 0 && <span className="inline-flex h-6 items-center rounded-full border border-ink px-2.5 text-xs font-medium text-ink">{t('committees.lateCount', { count: committee.lateMembers })} · {money(committee.owed)}</span>}
        {organizer && committee.potsToHandOver > 0 && <span className="inline-flex h-6 items-center rounded-full bg-surface px-2.5 text-xs font-medium text-ink">{t('committees.potsToHand', { count: committee.potsToHandOver })}</span>}
      </div>
    </li>
  );
}
