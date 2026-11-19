import { motion } from 'framer-motion';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarDays, Check, Wallet } from 'lucide-react';
import Section from './Section.jsx';
import IconTile from './IconTile.jsx';
import AnimatedAmount from '../AnimatedAmount.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { paceVerdict } from '../../utils/dashboardMath.js';

const RADIUS = 50;
const LENGTH = 2 * Math.PI * RADIUS;

function Ring({ share, over, calm, children }) {
  return (
    <div className="relative mx-auto h-[210px] w-[210px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#f0f0f2" strokeWidth="11" />
        <motion.circle
          cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="11" strokeLinecap="round"
          stroke={over ? '#dc2626' : '#111114'}
          strokeDasharray={LENGTH}
          initial={calm ? false : { strokeDashoffset: LENGTH }}
          animate={{ strokeDashoffset: LENGTH * (1 - share) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-9 text-center">{children}</div>
    </div>
  );
}

function Row({ icon, label, value, sub }) {
  return (
    <div className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
      <IconTile icon={icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">{sub}</span>
      </span>
      <span className="shrink-0 whitespace-nowrap text-lg font-bold tabular-nums tracking-tight text-ink">{value}</span>
    </div>
  );
}

// The month in one picture: what is left to spend (ring), where it came from and went (rows),
// how far through the month you are (day strip) and one sentence saying how it is going.
export default function MonthPulse({ month, pace, currency }) {
  const { t } = useTranslation();
  const { formatMoney, formatNumber, formatDate } = useFormat();
  const calm = useAppReducedMotion();

  const received = month.received;
  const spent = month.spentSelf;
  const left = month.left;
  const over = left < -0.005;
  const decimals = Math.max(received, spent, Math.abs(left), pace.projected) >= 10000 ? 0 : 2;
  const money = (value) => formatMoney(value, { decimals, currency });

  const share = received > 0 ? Math.min(1, Math.max(0, left / received)) : 0;
  const usedPercent = received > 0 ? Math.round((spent / received) * 100) : 0;
  const verdict = paceVerdict({ received, spent, left, projected: pace.projected });
  const monthName = formatDate(new Date(`${month.key}-01T00:00:00Z`), { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const sentence = {
    noIncome: t('dash.v.noIncome'),
    noSpend: t('dash.v.noSpend', { amount: money(received) }),
    good: t('dash.v.good', { amount: money(pace.projected), kept: money(received - pace.projected) }),
    close: t('dash.v.close', { amount: money(pace.projected), received: money(received) }),
    fast: t('dash.v.fast', { amount: money(pace.projected), over: money(pace.projected - received) }),
    over: t('balance.overspentMonth', { amount: money(Math.abs(left)) }),
  }[verdict];
  const calmVerdict = verdict === 'good' || verdict === 'noSpend';

  return (
    <Section icon={CalendarDays} title={t('dash.monthTitle')}>
      <div className="px-5 pb-5">
        <p className="-mt-1 mb-5 text-xs text-muted">{monthName}</p>

        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr] md:gap-10">
          <Ring share={share} over={over} calm={calm}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('dash.leftToSpend')}</span>
            <AnimatedAmount value={left} format={money} className={`mt-1.5 block whitespace-nowrap text-[1.65rem] font-bold leading-none tracking-tight tabular-nums ${over ? 'text-red-600' : 'text-ink'}`} />
            <span className="mt-1.5 text-xs text-muted">{received > 0 ? t('dash.leftOf', { amount: money(received) }) : t('dash.noIncomeYet')}</span>
          </Ring>

          <div className="min-w-0 divide-y divide-border">
            <Row icon={ArrowDownLeft} label={t('dash.received')} value={money(received)} sub={t('dash.soFar')} />
            <Row icon={ArrowUpRight} label={t('dash.spent')} value={money(spent)} sub={received > 0 ? t('dash.usedShare', { percent: formatNumber(usedPercent) }) : t('dash.soFar')} />
            <Row icon={Wallet} label={t('dash.safePerDay')} value={money(pace.safePerDay)} sub={pace.safePerDay > 0 ? t('dash.safeSub', { count: pace.daysLeft }) : t('dash.safeNone')} />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
            <span className="font-semibold text-ink">{t('dash.dayOf', { day: pace.day, total: pace.size })}</span>
            {spent > 0 && <span className="whitespace-nowrap tabular-nums">{t('dash.paceTo', { amount: money(pace.projected) })}</span>}
          </div>
          <div className="mt-2 flex gap-[3px]" dir="ltr" aria-hidden="true">
            {Array.from({ length: pace.size }, (_, index) => (
              <motion.span
                key={index}
                initial={calm ? false : { opacity: 0, scaleY: 0.4 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ duration: 0.3, delay: calm ? 0 : index * 0.018 }}
                className={`h-2 flex-1 origin-bottom rounded-[3px] ${index + 1 < pace.day ? 'bg-ink' : index + 1 === pace.day ? 'bg-ink ring-2 ring-ink/20' : 'bg-border'}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl bg-surface px-4 py-3.5">
          <IconTile icon={calmVerdict ? Check : AlertTriangle} variant={calmVerdict ? 'soft' : 'ink'} />
          <p className="min-w-0 flex-1 self-center text-sm leading-snug text-ink">{sentence}</p>
        </div>
      </div>
    </Section>
  );
}
