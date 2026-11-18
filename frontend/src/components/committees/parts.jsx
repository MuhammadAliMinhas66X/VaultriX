import { motion } from 'framer-motion';
import { useTranslation } from '../../i18n/useTranslation.js';

export const pad = 'p-4 sm:p-5';
export const dayDate = (day) => new Date(`${day}T00:00:00Z`);
export const shortDateOptions = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };

// One dot per round: filled = paid, ringed = overdue, soft = upcoming, bigger = your turn.
export function RoundDots({ rounds, calm }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
      {rounds.map((item, index) => (
        <motion.span
          key={item.round}
          initial={calm ? false : { opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: calm ? 0 : Math.min(index * 0.02, 0.6), duration: 0.25 }}
          className={`rounded-full ${item.mine ? 'h-4 w-4 ring-2 ring-ink ring-offset-2' : 'h-3 w-3'} ${item.status === 'paid' ? 'bg-ink' : item.status === 'overdue' ? 'border-2 border-ink bg-white' : item.status === 'due' ? 'bg-[#64748b]' : 'border border-border bg-white'}`}
        />
      ))}
    </div>
  );
}

export function StatusChip({ status }) {
  const { t } = useTranslation();
  const style = status === 'paid' ? 'bg-ink text-white' : status === 'overdue' ? 'border border-ink text-ink' : status === 'due' ? 'bg-surface text-ink' : 'text-muted';
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${style}`}>{t(`committees.status.${status}`)}</span>;
}

export function RoleChip({ role }) {
  const { t } = useTranslation();
  return <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-surface px-2.5 text-xs font-medium text-ink">{t(role === 'organizer' ? 'committees.roleOrganizer' : 'committees.roleMember')}</span>;
}

export function ProgressBar({ ratio, calm, label }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-border/60" role="img" aria-label={label}>
      <motion.div initial={calm ? false : { width: 0 }} animate={{ width: `${Math.min(1, Math.max(0, ratio)) * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full bg-ink" />
    </div>
  );
}

export function Tile({ label, children }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3.5">
      <p className="text-xs font-medium text-muted">{label}</p>
      {children}
    </div>
  );
}

// "Turn" chip for a payout status.
export function PayoutChip({ status, label }) {
  const style = status === 'received' ? 'bg-ink text-white' : status === 'ready' ? 'border border-ink text-ink' : 'text-muted';
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${style}`}>{label}</span>;
}
