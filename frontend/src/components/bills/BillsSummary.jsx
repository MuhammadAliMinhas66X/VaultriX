import { motion } from 'framer-motion';
import AnimatedAmount from '../AnimatedAmount.jsx';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { useTranslation } from '../../i18n/useTranslation.js';

const rise = (reduced, index) => ({
  initial: reduced ? false : { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: reduced ? 0 : 0.12 + index * 0.07, ease: [0.22, 1, 0.36, 1] },
});

function Cell({ label, children, sub, index, reduced }) {
  return (
    <motion.div {...rise(reduced, index)} className="flex min-w-0 flex-col gap-1 px-4 py-3.5 sm:px-5">
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="truncate text-lg font-bold tabular-nums tracking-tight text-ink sm:text-xl">{children}</p>
      <p className="min-h-[1rem] truncate text-xs text-muted">{sub}</p>
    </motion.div>
  );
}

// The top of the Bills page: one calm card instead of four boxes.
function BillsSummary({ summary, money }) {
  const { t } = useTranslation();
  const reduced = useAppReducedMotion();
  const total = summary.unpaidTotal;
  const overdue = summary.overdueTotal;
  const today = summary.dueTodayTotal;
  const rest = Math.max(0, total - overdue - today);
  const share = (value) => (total > 0 ? Math.max(0, (value / total) * 100) : 0);
  const bar = [
    { key: 'overdue', value: share(overdue), className: 'bg-ink' },
    { key: 'today', value: share(today), className: 'bg-ink/55' },
    { key: 'rest', value: share(rest), className: 'bg-ink/15' },
  ];
  const count = (value) => String(Math.round(value));

  return (
    <section aria-label={t('bills.title')} className="overflow-hidden rounded-2xl border border-border bg-white">
      <motion.div {...rise(reduced, 0)} className="flex flex-col gap-4 px-4 pb-5 pt-5 sm:px-5">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('bills.statOutstanding')}</p>
            <AnimatedAmount value={total} format={money} className="mt-1.5 block truncate text-[2rem] font-bold leading-none tracking-tight tabular-nums text-ink sm:text-[2.5rem]" />
          </div>
          <p className="shrink-0 pb-1 text-end text-xs text-muted">
            <span className="block text-sm font-semibold tabular-nums text-ink">
              <AnimatedAmount value={summary.unpaidCount} format={count} />
            </span>
            {t('bills.summaryUnpaid')}
          </p>
        </div>

        <div className="flex h-2 w-full gap-[3px] overflow-hidden rounded-full bg-surface" role="img" aria-label={t('bills.statOutstanding')}>
          {total > 0 &&
            bar.map((part, index) =>
              part.value > 0 ? (
                <motion.span
                  key={part.key}
                  className={`block h-full origin-left rounded-full ${part.className}`}
                  style={{ width: `${part.value}%` }}
                  initial={reduced ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: reduced ? 0 : 0.25 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
                />
              ) : null
            )}
        </div>
      </motion.div>

      <div className="grid grid-cols-2 divide-x divide-y divide-border border-t border-border rtl:divide-x-reverse sm:grid-cols-4 sm:divide-y-0">
        <Cell index={1} reduced={reduced} label={t('bills.statOverdue')} sub={summary.overdueCount > 0 ? money(summary.overdueTotal) : t('bills.noneLeft')}>
          <AnimatedAmount value={summary.overdueCount} format={count} />
        </Cell>
        <Cell index={2} reduced={reduced} label={t('bills.statDueToday')} sub={summary.dueTodayCount > 0 ? money(summary.dueTodayTotal) : t('bills.noneLeft')}>
          <AnimatedAmount value={summary.dueTodayCount} format={count} />
        </Cell>
        <Cell index={3} reduced={reduced} label={t('bills.statSoon')} sub={summary.soonCount > 0 ? money(summary.soonTotal) : t('bills.noneLeft')}>
          <AnimatedAmount value={summary.soonCount} format={count} />
        </Cell>
        <Cell index={4} reduced={reduced} label={t('bills.statPaidMonth')} sub={t('bills.statPaidCount', { count: summary.paidMonthCount })}>
          <AnimatedAmount value={summary.paidMonthTotal} format={money} />
        </Cell>
      </div>
    </section>
  );
}

export default BillsSummary;
