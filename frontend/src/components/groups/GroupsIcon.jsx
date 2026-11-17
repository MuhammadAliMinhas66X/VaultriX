import { motion, useReducedMotion } from 'framer-motion';

// Three people around a shared coin. Soft float and a slow coin spin; still when
// the person prefers reduced motion.
export default function GroupsIcon({ size = 56 }) {
  const calm = useReducedMotion();
  const bob = (delay) => (calm ? {} : { animate: { y: [0, -3, 0] }, transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay } });
  return (
    <span style={{ width: size, height: size }} className="relative flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ink to-[#3a3a42] text-white shadow-sm" aria-hidden="true">
      <svg viewBox="0 0 48 48" width={size * 0.72} height={size * 0.72} fill="none">
        <motion.g {...bob(0)}>
          <circle cx="24" cy="10" r="4" fill="currentColor" />
          <path d="M17 21c0-3.3 3.1-5 7-5s7 1.7 7 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </motion.g>
        <motion.g {...bob(0.5)}>
          <circle cx="9" cy="31" r="3.6" fill="currentColor" opacity="0.85" />
          <path d="M3.5 41c0-2.8 2.4-4.2 5.5-4.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
        </motion.g>
        <motion.g {...bob(1)}>
          <circle cx="39" cy="31" r="3.6" fill="currentColor" opacity="0.85" />
          <path d="M44.5 41c0-2.8-2.4-4.2-5.5-4.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
        </motion.g>
        <motion.g style={{ originX: '24px', originY: '33px' }} animate={calm ? {} : { scaleX: [1, 0.25, 1] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}>
          <circle cx="24" cy="33" r="7" stroke="currentColor" strokeWidth="2.2" />
          <path d="M24 29.5v7M26.3 31.2c-.5-.8-1.3-1-2.3-1-1.1 0-2 .5-2 1.4 0 2 4.5 1 4.5 3 0 .9-1 1.4-2.2 1.4-1 0-1.9-.3-2.4-1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </motion.g>
      </svg>
    </span>
  );
}
