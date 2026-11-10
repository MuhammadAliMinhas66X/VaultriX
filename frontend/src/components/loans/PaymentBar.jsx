import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { dateOptions } from '../../utils/dates.js';

const SHADES = ['#111114', '#3a3a42', '#5c5c64', '#7d7d85', '#9d9da4'];
const SIZE = 148;
const STROKE = 15;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const GAP = 3;

// Repayment summary that does not depend on dates: a ring split by payment, the
// three numbers that matter, and what was left after each payment.
function PaymentBar({ loan }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate, formatNumber } = useFormat();
  const reduced = useAppReducedMotion();
  const money = (value) => formatMoney(value, { decimals: 0, maxDecimals: 4, currency: loan.currency });
  const total = loan.amount > 0 ? loan.amount : 1;
  const paid = Math.min(loan.amount, loan.payments.reduce((sum, item) => sum + item.amount, 0));
  const left = Math.max(0, loan.amount - paid);
  const percent = Math.min(100, Math.floor((paid / total) * 100));
  const day = (value) => formatDate(new Date(value), { ...dateOptions, timeZone: 'UTC' });

  let running = loan.amount;
  let offset = 0;
  const steps = loan.payments.map((payment, index) => {
    running = Math.max(0, running - payment.amount);
    const length = Math.max(0, Math.min(1, payment.amount / total) * CIRC - (loan.payments.length > 1 ? GAP : 0));
    const step = { key: payment.id || index, number: index + 1, date: day(payment.paidAt), amount: payment.amount, left: running, shade: SHADES[Math.min(index, SHADES.length - 1)], length, offset };
    offset += Math.min(1, payment.amount / total) * CIRC;
    return step;
  });
  const last = loan.payments[loan.payments.length - 1];
  const done = left <= 0;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-white p-4 sm:p-5" role="img" aria-label={t('loans.paidOf', { paid: money(paid), total: money(loan.amount) })}>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#ececee" strokeWidth={STROKE} />
            {steps.map((step, index) => (
              <motion.circle
                key={step.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={step.shade}
                strokeWidth={STROKE}
                strokeLinecap="butt"
                strokeDasharray={`${step.length} ${CIRC}`}
                strokeDashoffset={-step.offset}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: index * 0.12 }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[1.9rem] font-bold leading-none tracking-tight tabular-nums text-ink">
              {formatNumber(percent)}
              <span className="text-base font-semibold text-muted">%</span>
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('loans.statPaid')}</span>
          </div>
        </div>

        <dl className="grid w-full min-w-0 flex-1 gap-3.5">
          {[
            [t('loans.statPaid'), money(paid), 'text-ink'],
            [t('loans.statLeft'), money(left), done ? 'text-muted' : 'text-ink'],
            [t('loans.statTotal'), money(loan.amount), 'text-muted'],
          ].map(([label, value, tone]) => (
            <div key={label} className="flex min-w-0 items-baseline justify-between gap-3 border-b border-border pb-2.5 last:border-b-0 last:pb-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
              <dd className={`whitespace-nowrap text-end text-lg font-bold tabular-nums sm:text-xl ${tone}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('loans.payments')}</p>
          <p className="text-end text-xs text-muted">
            {t('loans.chartCount', { count: loan.payments.length })}
            {last ? ` · ${t('loans.chartLast', { date: day(last.paidAt) })}` : ''}
          </p>
        </div>

        <ul className="flex flex-col gap-2.5">
          <li className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted">{t('loans.statTotal')}</span>
              <span className="font-semibold tabular-nums text-ink">{money(loan.amount)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface">
              <div className="h-full w-full rounded-full bg-border" />
            </div>
          </li>
          {steps.map((step, index) => (
            <li key={step.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-muted">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: step.shade }} />
                  <span className="truncate">
                    #{step.number} · <span className="font-semibold text-ink">-{money(step.amount)}</span>
                    <span className="hidden sm:inline"> · {step.date}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 font-semibold tabular-nums text-ink">
                  {step.left <= 0 && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  {money(step.left)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: step.shade }}
                  initial={reduced ? false : { width: '100%' }}
                  animate={{ width: `${Math.max(step.left > 0 ? 1.5 : 0, (step.left / total) * 100)}%` }}
                  transition={{ duration: 0.6, delay: 0.15 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default PaymentBar;
