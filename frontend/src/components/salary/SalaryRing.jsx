import { useEffect, useId, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { useFormat } from '../../i18n/useFormat.js';
import { useTranslation } from '../../i18n/useTranslation.js';

const R = 96;
const STROKE = 12;
const C = 2 * Math.PI * R;
const AMBER = '#f5a83a';
const ease = [0.22, 1, 0.36, 1];

const SPARKS = [
  { angle: 25, size: 6, delay: 0 },
  { angle: 150, size: 5, delay: 1.1 },
  { angle: 265, size: 6, delay: 0.6 },
  { angle: 330, size: 4.5, delay: 1.6 },
];

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
    const controls = animate(motionValue, value, { duration: 1.1, ease });
    return () => controls.stop();
  }, [value, calm, motionValue]);
  return <span className={`whitespace-nowrap tabular-nums ${className}`}>{shown}</span>;
}

function Spark({ angle, size, delay, calm }) {
  const radius = 113;
  const x = 120 + radius * Math.cos((angle * Math.PI) / 180);
  const y = 120 + radius * Math.sin((angle * Math.PI) / 180);
  const s = size;
  const path = `M0 ${-s} L${s * 0.28} ${-s * 0.28} L${s} 0 L${s * 0.28} ${s * 0.28} L0 ${s} L${-s * 0.28} ${s * 0.28} L${-s} 0 L${-s * 0.28} ${-s * 0.28} Z`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.path
        d={path}
        fill={AMBER}
        initial={calm ? false : { scale: 0, opacity: 0 }}
        animate={calm ? { scale: 1, opacity: 0.8 } : { scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 45, 90] }}
        transition={calm ? { duration: 0 } : { duration: 2.4, delay, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' }}
      />
    </g>
  );
}

export default function SalaryRing({ total, used, currency, leftLabel }) {
  const { t } = useTranslation();
  const calm = useAppReducedMotion();
  const uid = useId().replace(/:/g, '');
  const budget = total > 0 ? total : 0;
  const over = budget > 0 && used > budget;
  const left = budget - used;
  const leftShare = budget > 0 && !over ? Math.max(0, Math.min(1, left / budget)) : 0;
  const percent = Math.round(leftShare * 100);
  const length = leftShare * C;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[150px]">
      <svg viewBox="0 0 240 240" className="h-full w-full" role="img" aria-label={t('salary.ringLabel')}>
        <defs>
          <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="120" cy="120" r={R} fill="none" stroke="#ececee" strokeWidth={STROKE} />
        {length > 0.5 && (
          <motion.g filter={`url(#${uid}-glow)`} animate={calm ? undefined : { opacity: [1, 0.8, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
            <motion.circle
              cx="120"
              cy="120"
              r={R}
              fill="none"
              stroke={AMBER}
              strokeWidth={STROKE}
              strokeLinecap="round"
              transform="rotate(-90 120 120)"
              initial={calm ? false : { strokeDasharray: `0 ${C}` }}
              animate={{ strokeDasharray: `${length} ${C}` }}
              transition={{ duration: 1.2, delay: 0.1, ease }}
            />
          </motion.g>
        )}
        {SPARKS.map((spark) => (
          <Spark key={spark.angle} {...spark} calm={calm} />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-9 text-center">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">{over ? t('salary.overShort') : leftLabel}</span>
        <CountUp value={Math.abs(left)} currency={currency} className={`mt-1 text-sm font-bold leading-none tracking-tight ${over ? 'text-ink' : 'text-[#0ea896]'}`} />
        <span className="mt-1 text-[9px] text-muted">{over ? t('salary.centerOf') : t('salary.percentLeft', { percent })}</span>
      </div>
    </div>
  );
}
