import { useEffect, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { useFormat } from '../../i18n/useFormat.js';
import { useTranslation } from '../../i18n/useTranslation.js';

const OUTER = 92;
const INNER = 68;
const STROKE = 16;
const circ = (r) => 2 * Math.PI * r;

// Numbers that roll up to their value (still when the person prefers less motion).
export function CountUp({ value, currency, decimals = 0, className = '' }) {
  const { formatMoney } = useFormat();
  const calm = useAppReducedMotion();
  const motionValue = useMotionValue(calm ? value : 0);
  const text = useTransform(motionValue, (latest) => formatMoney(latest, { decimals, currency }));
  const [shown, setShown] = useState(() => formatMoney(calm ? value : 0, { decimals, currency }));
  useEffect(() => text.on('change', setShown), [text]);
  useEffect(() => {
    if (calm) {
      motionValue.set(value);
      return undefined;
    }
    const controls = animate(motionValue, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, calm, motionValue]);
  return <span className={`whitespace-nowrap tabular-nums ${className}`}>{shown}</span>;
}

function Arc({ r, from, share, color, delay, calm }) {
  const length = circ(r);
  const visible = Math.max(0, Math.min(1, share)) * length;
  if (visible <= 0) return null;
  return (
    <motion.circle
      cx="110"
      cy="110"
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="butt"
      strokeDasharray={`${visible} ${length}`}
      strokeDashoffset={-from * length}
      transform="rotate(-90 110 110)"
      initial={calm ? false : { opacity: 0, strokeDasharray: `0 ${length}` }}
      animate={{ opacity: 1, strokeDasharray: `${visible} ${length}` }}
      transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

// One chart, two rings. Outer: the salary split into what is spent and what is left.
// Inner: how much of the salary is already given a job by the plan.
export default function SalaryRing({ income, spent, planned, currency }) {
  const { t } = useTranslation();
  const calm = useAppReducedMotion();
  const total = income > 0 ? income : 0;
  const spentShare = total > 0 ? Math.min(1, spent / total) : 0;
  const plannedShare = total > 0 ? Math.min(1, planned / total) : 0;
  const left = income - spent;
  const over = total > 0 && spent > total;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[260px]">
      <svg viewBox="0 0 220 220" className="h-full w-full" role="img" aria-label={t('salary.ringLabel')}>
        <circle cx="110" cy="110" r={OUTER} fill="none" stroke="#ececee" strokeWidth={STROKE} />
        <circle cx="110" cy="110" r={INNER} fill="none" stroke="#f3f3f4" strokeWidth={STROKE} />
        <Arc r={OUTER} from={0} share={spentShare} color="#111114" delay={0.1} calm={calm} />
        <Arc r={INNER} from={0} share={plannedShare} color="#8b8b92" delay={0.35} calm={calm} />
        {over && <circle cx="110" cy="110" r={OUTER + 11} fill="none" stroke="#111114" strokeWidth="1.5" strokeDasharray="3 4" />}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{over ? t('salary.overShort') : t('salary.ringLeft')}</span>
        <CountUp value={Math.abs(left)} currency={currency} className="mt-1 text-[1.6rem] font-bold leading-none tracking-tight text-ink" />
        <span className="mt-1.5 text-xs text-muted">{t('salary.centerOf')}</span>
        <CountUp value={total} currency={currency} className="text-xs font-medium text-muted" />
      </div>
    </div>
  );
}
