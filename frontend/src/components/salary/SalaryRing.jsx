import { useEffect, useId, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { useFormat } from '../../i18n/useFormat.js';
import { useTranslation } from '../../i18n/useTranslation.js';

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

const ease = [0.22, 1, 0.36, 1];

const THEMES = {
  attached: { stops: ['#ffd98a', '#f5a83a', '#e8791f'], halo: '#f5a83a', spark: '#f5a83a' },
  detached: { stops: ['#d8ccff', '#8b5cf6', '#5b21b6'], halo: '#8b5cf6', spark: '#8b5cf6' },
  over: { stops: ['#fca5a5', '#ef4444', '#b91c1c'], halo: '#ef4444', spark: '#ef4444' },
};

const SPARKS = [
  { x: 28, y: 40, size: 6, delay: 0 },
  { x: 214, y: 58, size: 5, delay: 1 },
  { x: 204, y: 196, size: 6.5, delay: 0.5 },
  { x: 36, y: 188, size: 4.5, delay: 1.5 },
];

const star = (s) => `M0 ${-s} L${s * 0.28} ${-s * 0.28} L${s} 0 L${s * 0.28} ${s * 0.28} L0 ${s} L${-s * 0.28} ${s * 0.28} L${-s} 0 L${-s * 0.28} ${-s * 0.28} Z`;

function Spark({ x, y, size, delay, calm, color }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.path
        d={star(size)}
        fill={color}
        initial={calm ? false : { scale: 0, opacity: 0 }}
        animate={calm ? { scale: 1, opacity: 0.85 } : { scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 45, 90] }}
        transition={calm ? { duration: 0 } : { duration: 2.4, delay, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' }}
      />
    </g>
  );
}

export default function SalaryRing({ total, used, currency, leftLabel, detached }) {
  const { t } = useTranslation();
  const calm = useAppReducedMotion();
  const uid = useId().replace(/:/g, '');
  const budget = total > 0 ? total : 0;
  const over = budget > 0 && used > budget;
  const left = budget - used;
  const theme = over ? THEMES.over : detached ? THEMES.detached : THEMES.attached;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[150px]">
      <svg viewBox="0 0 240 240" className="h-full w-full" role="img" aria-label={t('salary.ringLabel')}>
        <defs>
          <radialGradient id={`${uid}-disc`} cx="35%" cy="30%" r="85%">
            <stop offset="0%" stopColor={theme.stops[0]} />
            <stop offset="55%" stopColor={theme.stops[1]} />
            <stop offset="100%" stopColor={theme.stops[2]} />
          </radialGradient>
          <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${uid}-clip`}>
            <circle cx="120" cy="120" r="84" />
          </clipPath>
          <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {detached ? (
          <motion.circle cx="120" cy="120" r="102" fill="none" stroke={theme.halo} strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" strokeDasharray="16 14" style={{ originX: '120px', originY: '120px' }} animate={calm ? undefined : { rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} />
        ) : (
          <circle cx="120" cy="120" r="102" fill="none" stroke={theme.halo} strokeOpacity="0.4" strokeWidth="4" />
        )}

        <motion.g filter={`url(#${uid}-glow)`} style={{ originX: '120px', originY: '120px' }} initial={calm ? false : { scale: 0.6, opacity: 0 }} animate={calm ? { scale: 1, opacity: 1 } : { scale: [1, 1.035, 1], opacity: 1 }} transition={calm ? { duration: 0 } : { scale: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.6 } }}>
          <circle cx="120" cy="120" r="84" fill={`url(#${uid}-disc)`} />
        </motion.g>

        {!calm && (
          <g clipPath={`url(#${uid}-clip)`}>
            <motion.rect x="-70" y="20" width="60" height="200" fill={`url(#${uid}-shine)`} transform="rotate(20 120 120)" animate={{ x: [-70, 300] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }} />
          </g>
        )}

        {SPARKS.map((spark) => (
          <Spark key={`${spark.x}-${spark.y}`} {...spark} calm={calm} color={theme.spark} />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/80">{over ? t('salary.overShort') : leftLabel}</span>
        <CountUp value={Math.abs(left)} currency={currency} className="mt-1 text-[15px] font-bold leading-none tracking-tight text-white" />
      </div>
    </div>
  );
}
