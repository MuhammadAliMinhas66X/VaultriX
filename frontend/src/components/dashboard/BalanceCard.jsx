import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';

const STORAGE_KEY = 'vaultrix.hideBalance';
const slow = { stiffness: 26, damping: 15, mass: 1.9 };

function Chip() {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 56 42" className="h-[42px] w-14 shrink-0 lg:h-[52px] lg:w-[69px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4f4f7" />
          <stop offset="35%" stopColor="#c9c9d1" />
          <stop offset="65%" stopColor="#e6e6eb" />
          <stop offset="100%" stopColor="#a9a9b3" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="55" height="41" rx="7" fill={`url(#${id}-metal)`} stroke="#8d8d97" strokeWidth="0.8" />
      <g fill="none" stroke="#6f6f79" strokeWidth="0.9" strokeLinecap="round">
        <path d="M0.5 14.5H19M0.5 21H19M0.5 27.5H19M37 14.5H55.5M37 21H55.5M37 27.5H55.5" />
        <path d="M19 0.5V13M37 0.5V13M19 29V41.5M37 29V41.5" />
        <rect x="19" y="13" width="18" height="16" rx="3.5" />
      </g>
      <rect x="19.6" y="13.6" width="16.8" height="14.8" rx="3" fill={`url(#${id}-shine)`} />
      <g fill="none" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23.6 17.6L28 25.4L32.4 17.6" stroke="#ffffff" strokeOpacity="0.7" transform="translate(0 0.7)" />
        <path d="M23.6 17.6L28 25.4L32.4 17.6" stroke="#3d3d47" />
      </g>
      <rect x="0.5" y="0.5" width="55" height="20" rx="7" fill={`url(#${id}-shine)`} opacity="0.5" />
    </svg>
  );
}

const readHidden = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch (error) {
    return false;
  }
};

function RevealText({ text, still }) {
  const chars = [...text];
  const total = chars.length;
  return (
    <span aria-label={text} className="inline-flex whitespace-nowrap">
      <span aria-hidden="true" className="inline-flex">
        {chars.map((char, index) => (
          <motion.span
            key={`${total - index}-${char}`}
            className="inline-block"
            initial={still ? false : { opacity: 0, y: '0.4em', filter: 'blur(7px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={still ? { duration: 0 } : { duration: 0.8, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </span>
    </span>
  );
}

const reveal = (reduced, index) => ({
  initial: reduced ? false : { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay: 0.15 + index * 0.14, ease: [0.22, 1, 0.36, 1] },
});

function BalanceCard({ status, amount = 0, currency, holder, message }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();
  const reduced = useAppReducedMotion();
  const ref = useRef(null);
  const [hidden, setHidden] = useState(readHidden);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(px, [0, 1], [-5, 5]), slow);
  const rotateX = useSpring(useTransform(py, [0, 1], [2.5, -2.5]), slow);
  const shadowX = useTransform(rotateY, (value) => value * -3);
  const shadow = useMotionTemplate`${shadowX}px 24px 48px -20px rgba(17,17,20,0.65)`;

  const toggle = () => {
    setHidden((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch (error) {
        return next;
      }
      return next;
    });
  };

  const move = (event) => {
    if (reduced || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    px.set(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)));
    py.set(Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)));
  };

  const rest = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const text = formatMoney(amount, { decimals: 2, currency });

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      onPointerDown={move}
      onPointerMove={move}
      onPointerLeave={rest}
      onPointerUp={rest}
      onPointerCancel={rest}
      style={{ rotateX: reduced ? 0 : rotateX, rotateY: reduced ? 0 : rotateY, transformPerspective: 1100, boxShadow: shadow, touchAction: 'pan-y' }}
      className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0d0d10] via-[#1c1c21] to-[#3b3b44] p-5 text-white md:flex md:min-h-[280px] md:flex-col md:justify-between md:p-8 lg:min-h-[330px] lg:p-10"
    >
      <motion.div {...reveal(reduced, 0)} className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Chip />
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] lg:text-base">
            Vaultrix<sup className="ms-0.5 align-super text-[7px] font-semibold tracking-normal text-white/80">TM</sup>
          </p>
        </div>
        <p className="pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{currency}</p>
      </motion.div>

      <motion.div {...reveal(reduced, 1)} className="relative mt-8">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/65">{t('dashboard.inAccount')}</p>
          {status === 'ready' && (
            <button
              type="button"
              onClick={toggle}
              aria-pressed={hidden}
              aria-label={hidden ? t('dashboard.showBalance') : t('dashboard.hideBalance')}
              className="-me-2 flex h-9 w-9 items-center justify-center rounded-full text-white/75 outline-none transition hover:text-white active:scale-90 focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={hidden ? 'off' : 'on'}
                  initial={reduced ? false : { opacity: 0, scale: 0.6, rotate: -25 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: 25 }}
                  transition={{ duration: 0.18 }}
                  className="flex"
                >
                  {hidden ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                </motion.span>
              </AnimatePresence>
            </button>
          )}
        </div>
        <div className="mt-1.5 flex h-[1.25em] items-center overflow-hidden text-[clamp(1.75rem,9vw,2.4rem)] font-semibold tracking-tight md:text-[2.75rem] lg:text-[3.5rem]">
          {status === 'ready' ? (
            <AnimatePresence mode="wait" initial={false}>
              {hidden ? (
                <motion.p
                  key="hidden"
                  initial={reduced ? false : { opacity: 0, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, filter: 'blur(8px)' }}
                  transition={{ duration: 0.25 }}
                  className="whitespace-nowrap leading-[1.25em]"
                >
                  {'\u2022\u2022\u2022\u2022\u2022\u2022'}
                </motion.p>
              ) : (
                <motion.p
                  key="shown"
                  initial={false}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, filter: 'blur(8px)' }}
                  transition={{ duration: 0.2 }}
                  className="whitespace-nowrap leading-[1.25em] tabular-nums"
                >
                  <RevealText text={text} still={reduced} />
                </motion.p>
              )}
            </AnimatePresence>
          ) : (
            <p className="text-sm font-normal tracking-normal text-white/75">{message}</p>
          )}
        </div>
      </motion.div>

      {holder && (
        <motion.div {...reveal(reduced, 2)} className="relative mt-7">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">{t('dashboard.cardHolder')}</p>
          <p className="mt-1 truncate text-sm font-semibold uppercase tracking-[0.14em] md:text-base lg:text-lg">{holder}</p>
        </motion.div>
      )}
    </motion.div>
  );
}

export default BalanceCard;
