import { useEffect, useId, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { useFormat } from '../../i18n/useFormat.js';
import { useTranslation } from '../../i18n/useTranslation.js';

const R = 96;
const STROKE = 15;
const C = 2 * Math.PI * R;
const GAP = 4;
const ease = [0.22, 1, 0.36, 1];

const SPARKS = [
  { angle: 20, size: 7, delay: 0 },
  { angle: 82, size: 5, delay: 0.7 },
  { angle: 140, size: 7.5, delay: 1.3 },
  { angle: 200, size: 5.5, delay: 0.35 },
  { angle: 262, size: 7, delay: 1.0 },
  { angle: 318, size: 5, delay: 1.7 },
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

function Arc({ from, length, stroke, delay, calm }) {
  if (length <= 0.5) return null;
  return (
    <motion.circle
      cx="120"
      cy="120"
      r={R}
      fill="none"
      stroke={stroke}
      strokeWidth={STROKE}
      strokeDashoffset={-from}
      transform="rotate(-90 120 120)"
      initial={calm ? false : { strokeDasharray: `0 ${C}` }}
      animate={{ strokeDasharray: `${length} ${C}` }}
      transition={{ duration: 1.2, delay, ease }}
    />
  );
}

function Spark({ angle, size, delay, calm }) {
  const radius = 112;
  const x = 120 + radius * Math.cos((angle * Math.PI) / 180);
  const y = 120 + radius * Math.sin((angle * Math.PI) / 180);
  const s = size;
  const path = `M0 ${-s} L${s * 0.28} ${-s * 0.28} L${s} 0 L${s * 0.28} ${s * 0.28} L0 ${s} L${-s * 0.28} ${s * 0.28} L${-s} 0 L${-s * 0.28} ${-s * 0.28} Z`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.path
        d={path}
        fill="#ffffff"
        initial={calm ? false : { scale: 0, opacity: 0 }}
        animate={calm ? { scale: 1, opacity: 0.8 } : { scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 45, 90] }}
        transition={calm ? { duration: 0 } : { duration: 2.4, delay, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' }}
      />
    </g>
  );
}

export default function SalaryRing({ total, used, currency, usedLabel, leftLabel }) {
  const { t } = useTranslation();
  const calm = useAppReducedMotion();
  const uid = useId().replace(/:/g, '');
  const budget = total > 0 ? total : 0;
  const share = budget > 0 ? Math.min(1, Math.max(0, used) / budget) : 0;
  const over = budget > 0 && used > budget;
  const left = budget - used;
  const usedLen = share * C;
  const hasBoth = usedLen > 0 && usedLen < C;
  const usedDraw = hasBoth ? Math.max(0, usedLen - GAP / 2) : usedLen;
  const leftFrom = usedLen + (hasBoth ? GAP / 2 : 0);
  const leftDraw = budget > 0 && !over ? Math.max(0, C - usedLen - (hasBoth ? GAP : 0)) : 0;
  const glintLen = C * 0.085;
  const tailLen = C * 0.2;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px]">
      <svg viewBox="0 0 240 240" className="h-full w-full" role="img" aria-label={t('salary.ringLabel')}>
        <defs>
          <linearGradient id={`${uid}-used`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff2d55" />
            <stop offset="55%" stopColor="#ff7a18" />
            <stop offset="100%" stopColor="#ffd60a" />
            {!calm && <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="7s" repeatCount="indefinite" />}
          </linearGradient>
          <linearGradient id={`${uid}-left`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#00e0a4" />
            <stop offset="100%" stopColor="#14b8ff" />
            {!calm && <animateTransform attributeName="gradientTransform" type="rotate" from="360 0.5 0.5" to="0 0.5 0.5" dur="9s" repeatCount="indefinite" />}
          </linearGradient>
          <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="120" cy="120" r={R} fill="none" stroke="#ffffff" strokeOpacity="0.09" strokeWidth={STROKE} />

        <g filter={`url(#${uid}-glow)`}>
          <Arc from={0} length={usedDraw} stroke={`url(#${uid}-used)`} delay={0.1} calm={calm} />
          <Arc from={leftFrom} length={leftDraw} stroke={`url(#${uid}-left)`} delay={0.5} calm={calm} />
        </g>

        {!calm && budget > 0 && (
          <motion.g style={{ originX: '120px', originY: '120px' }} animate={{ rotate: 360 }} transition={{ duration: 5.5, repeat: Infinity, ease: 'linear' }}>
            <circle cx="120" cy="120" r={R} fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth={STROKE - 6} strokeLinecap="round" strokeDasharray={`${tailLen} ${C}`} transform="rotate(-90 120 120)" />
            <circle cx="120" cy="120" r={R} fill="none" stroke="#ffffff" strokeWidth={STROKE - 4} strokeLinecap="round" strokeDasharray={`${glintLen} ${C}`} strokeDashoffset={-(tailLen - glintLen)} transform="rotate(-90 120 120)" filter={`url(#${uid}-glow)`} />
          </motion.g>
        )}

        {SPARKS.map((spark) => (
          <Spark key={spark.angle} {...spark} calm={calm} />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">{over ? t('salary.overShort') : leftLabel}</span>
        <CountUp value={Math.abs(left)} currency={currency} className="mt-1.5 text-[1.75rem] font-bold leading-none tracking-tight text-white" />
        <span className="mt-2 text-xs text-white/50">{t('salary.centerOf')}</span>
        <CountUp value={budget} currency={currency} className="text-xs font-medium text-white/70" />
      </div>
      <span className="sr-only">{usedLabel}</span>
    </div>
  );
}
