import { useRef } from 'react';
import { motion, useInView, useScroll, useSpring, useTransform } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { owner } from '../content.js';
import { ownerPhoto } from '../screens.js';
import { Reveal, SectionTag, Tilt } from './ui.jsx';

const ease = [0.22, 1, 0.36, 1];

function Badge({ show, reduced }) {
  const label = `${owner.name.toUpperCase()}  *  FOUNDER  *  VAULTRIX  *  `;
  return (
    <motion.div
      className="absolute -bottom-7 -right-3 h-28 w-28 sm:-right-9 sm:h-36 sm:w-36"
      initial={reduced ? false : { scale: 0, rotate: -140, opacity: 0 }}
      animate={show ? { scale: 1, rotate: 0, opacity: 1 } : { scale: 0, rotate: -140, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 1.1 }}
    >
      <svg viewBox="0 0 160 160" className="pf-spin h-full w-full" aria-hidden="true">
        <defs>
          <path id="pf-circle" d="M80,80 m-62,0 a62,62 0 1,1 124,0 a62,62 0 1,1 -124,0" />
        </defs>
        <circle cx="80" cy="80" r="78" fill="#111114" />
        <text className="pf-mono" fontSize="11.4" fill="#fff" letterSpacing="1.6">
          <textPath href="#pf-circle">{label}</textPath>
        </text>
      </svg>
      <span className="pf-wordmark absolute inset-0 flex items-center justify-center text-3xl text-white sm:text-4xl">V</span>
    </motion.div>
  );
}

function Corner({ className, origin, show, reduced }) {
  return (
    <motion.span
      aria-hidden="true"
      className={`absolute z-20 h-5 w-5 border-ink ${className}`}
      style={{ transformOrigin: origin }}
      initial={reduced ? false : { scale: 0 }}
      animate={{ scale: show ? 1 : 0 }}
      transition={{ duration: 0.6, delay: 0.9, ease }}
    />
  );
}

// Five dark panels lift one after another to uncover the photo while the
// picture settles from a slight zoom. A light line sweeps down once it is clear.
function PortraitBox({ show, reduced }) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden border border-ink bg-ink">
      <motion.div className="absolute inset-0" initial={reduced ? false : { scale: 1.3 }} animate={{ scale: show ? 1 : 1.3 }} transition={{ duration: 1.8, ease }}>
        {ownerPhoto && <img src={ownerPhoto} alt={owner.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-top" />}
      </motion.div>

      {!reduced &&
        [0, 1, 2, 3, 4].map((index) => (
          <motion.span
            key={index}
            aria-hidden="true"
            className="absolute inset-y-0 z-10 bg-ink"
            style={{ left: `${index * 20}%`, width: '20.5%', transformOrigin: index % 2 === 0 ? '50% 0%' : '50% 100%' }}
            initial={{ scaleY: 1 }}
            animate={{ scaleY: show ? 0 : 1 }}
            transition={{ duration: 0.85, delay: 0.1 + index * 0.09, ease }}
          />
        ))}

      {!reduced && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 z-10 h-px bg-white shadow-[0_0_18px_4px_rgba(255,255,255,0.55)]"
          initial={{ top: '0%', opacity: 0 }}
          animate={show ? { top: ['0%', '100%'], opacity: [0, 1, 1, 0] } : { top: '0%', opacity: 0 }}
          transition={{ duration: 1.5, delay: 1.2, ease: 'easeInOut' }}
        />
      )}

      <div className="pf-mono absolute bottom-3.5 left-5 right-5 z-10 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white mix-blend-difference">
        <span>Fig. 01</span>
        <span>MAM / portrait</span>
      </div>
    </div>
  );
}

function Founder() {
  const sectionRef = useRef(null);
  const photoRef = useRef(null);
  const reduced = useAppReducedMotion();
  const show = useInView(photoRef, { once: true, amount: 0.35 }) || reduced;
  const [first, ...rest] = owner.name.split(' ');

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const photoY = useSpring(useTransform(scrollYProgress, [0, 1], [46, -46]), { stiffness: 90, damping: 22 });
  const textY = useSpring(useTransform(scrollYProgress, [0, 1], [-18, 18]), { stiffness: 90, damping: 22 });

  const mask = (text, delay) => (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span className="block" initial={reduced ? false : { y: '105%' }} animate={{ y: show ? '0%' : '105%' }} transition={{ duration: 0.9, delay, ease }}>
        {text}
      </motion.span>
    </span>
  );

  return (
    <section ref={sectionRef} id="founder" className="pf-snap-target relative flex min-h-[100svh] items-center overflow-hidden border-b border-border">
      <div className="pf-focus-body mx-auto grid w-full max-w-[1400px] items-center gap-14 px-5 pb-12 pt-24 sm:px-8 lg:grid-cols-12 lg:pb-8 lg:pt-20">
        <div className="lg:col-span-5">
          <motion.div style={reduced ? undefined : { y: photoY }}>
            <Tilt max={4}>
              <div ref={photoRef} className="relative mx-auto w-[min(82vw,420px)] lg:w-[min(420px,48vh)]">
                <PortraitBox show={show} reduced={reduced} />
                <Corner className="left-2.5 top-2.5 border-l-2 border-t-2" origin="0% 0%" show={show} reduced={reduced} />
                <Corner className="right-2.5 top-2.5 border-r-2 border-t-2" origin="100% 0%" show={show} reduced={reduced} />
                <Corner className="bottom-2.5 left-2.5 border-b-2 border-l-2" origin="0% 100%" show={show} reduced={reduced} />
                <Corner className="bottom-2.5 right-2.5 border-b-2 border-r-2" origin="100% 100%" show={show} reduced={reduced} />
                <Badge show={show} reduced={reduced} />
              </div>
            </Tilt>
          </motion.div>
        </div>

        <motion.div className="lg:col-span-7" style={reduced ? undefined : { y: textY }}>
          <SectionTag index="06" label="Founder" />
          <h2 className="mt-5 text-[clamp(2.3rem,min(5.6vw,8.6vh),5.2rem)] font-semibold leading-[0.98]">
            {mask('Owned by', 0.25)}
            {mask(first, 0.4)}
            {mask(rest.join(' '), 0.55)}
          </h2>
          <div className="mt-7 max-w-xl space-y-4 text-lg leading-relaxed text-ink/70">
            {owner.lines.map((line, index) => (
              <Reveal key={line} delay={0.7 + index * 0.12}>
                <p>{line}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 border-t border-border pt-5">
            <motion.span aria-hidden="true" className="mb-5 block h-px origin-left bg-ink" initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: show ? 1 : 0 }} transition={{ duration: 1.2, delay: 1, ease }} />
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <p className="pf-mono text-[11px] uppercase tracking-[0.18em] text-muted">{owner.role}</p>
              {owner.email && (
                <a href={`mailto:${owner.email}`} className="text-[15px] font-medium underline underline-offset-4">
                  {owner.email}
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default Founder;
