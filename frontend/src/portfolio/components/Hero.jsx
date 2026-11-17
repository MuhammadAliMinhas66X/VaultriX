import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { links } from '../content.js';
import { screens } from '../screens.js';
import { JoinButton, GhostLink } from './Buttons.jsx';
import { LogoStrip } from './Logos.jsx';
import { scrollToId } from './Nav.jsx';
import { AndroidFrame, CountUp, LaptopFrame, PhoneFrame, SplitText, TabletFrame } from './ui.jsx';

// Position, entrance and idle float of one device. Only translate and opacity animate (no blur
// filter, no continuous rotation), so the screens are rasterised once and stay sharp.
function Layer({ children, className, depth, mx, my, float, delay, scroll, tilt = 0 }) {
  const reduced = useAppReducedMotion();
  const x = useTransform(mx, (value) => value * depth);
  const y = useTransform([my, scroll], ([pointer, lift]) => pointer * depth + lift * depth * 4);
  return (
    <motion.div style={{ x: reduced ? 0 : x, y: reduced ? 0 : y }} className={`absolute ${className}`}>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 90 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ rotate: tilt }}
        transition={{ type: 'spring', stiffness: 80, damping: 17, mass: 1, delay }}
      >
        <motion.div
          animate={reduced ? undefined : { y: [0, float, 0] }}
          transition={{ duration: 6.5 + Math.abs(float) / 2, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={reduced ? undefined : { y: -8 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Motion graphics behind the devices: a dotted field, radar pulses, a slow orbit with travelling
// dots, and a rising line that draws itself again and again.
function HeroBackdrop() {
  const reduced = useAppReducedMotion();
  return (
    <svg aria-hidden="true" viewBox="0 0 640 576" className="pointer-events-none absolute inset-0 h-full w-full" fill="none">
      <defs>
        <pattern id="hero-dots" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.3" fill="#111114" fillOpacity="0.16" />
        </pattern>
        <radialGradient id="hero-fade" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#fff" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="hero-mask"><rect width="640" height="576" fill="url(#hero-fade)" /></mask>
      </defs>
      <rect width="640" height="576" fill="url(#hero-dots)" mask="url(#hero-mask)" />
      {[0, 2.4, 4.8].map((delay) => (
        <circle key={delay} className={reduced ? '' : 'pf-pulse'} style={{ animationDelay: `${delay}s` }} cx="320" cy="290" r="130" stroke="#111114" strokeOpacity={reduced ? 0.08 : 0.4} strokeWidth="1.2" />
      ))}
      <g className={reduced ? '' : 'pf-spin-slow'} style={{ transformOrigin: '320px 290px' }}>
        <circle cx="320" cy="290" r="250" stroke="#111114" strokeOpacity="0.22" strokeWidth="1.2" strokeDasharray="3 9" />
        <circle cx="570" cy="290" r="5" fill="#111114" />
        <circle cx="145" cy="465" r="3.5" fill="#111114" fillOpacity="0.7" />
        <circle cx="195" cy="75" r="3" fill="#111114" fillOpacity="0.5" />
      </g>
      <motion.path
        d="M20 470 L110 430 L170 448 L250 380 L330 396 L410 310 L480 330 L560 215 L620 170"
        stroke="#111114"
        strokeOpacity="0.55"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? false : { pathLength: 0, opacity: 0 }}
        animate={reduced ? { pathLength: 1, opacity: 1 } : { pathLength: [0, 1, 1, 1], opacity: [0, 1, 1, 0] }}
        transition={reduced ? { duration: 0 } : { duration: 7, repeat: Infinity, ease: 'easeInOut', times: [0, 0.45, 0.85, 1], delay: 1.2 }}
      />
    </svg>
  );
}

function FloatChip({ label, value, className, delay }) {
  const reduced = useAppReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14, delay }}
      className={`absolute z-40 hidden sm:block ${className}`}
    >
      <div className={`flex items-center gap-[1.4cqw] rounded-full border border-border bg-white py-[1.1cqw] pe-[2.4cqw] ps-[1.6cqw] shadow-[0_1.5cqw_4cqw_-1.5cqw_rgba(17,17,20,0.35)] ${reduced ? '' : 'pf-bob'}`} style={{ animationDelay: `${delay}s` }}>
        <span className="flex h-[3.6cqw] min-h-[16px] w-[3.6cqw] min-w-[16px] items-center justify-center rounded-full bg-ink">
          <span className="h-[1.1cqw] min-h-[5px] w-[1.1cqw] min-w-[5px] rounded-full bg-white" />
        </span>
        <span className="whitespace-nowrap text-[max(1.7cqw,10px)] leading-tight text-muted">
          {label}
          <span className="block font-semibold text-ink">{value}</span>
        </span>
      </div>
    </motion.div>
  );
}

function Hero() {
  const { isAuthenticated } = useAuth();
  const reduced = useAppReducedMotion();
  const stage = useRef(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: stage, offset: ['start start', 'end start'] });
  const lift = useTransform(scrollYProgress, [0, 1], [0, -1]);
  const mx = useSpring(rawX, { stiffness: 50, damping: 18, mass: 1.2 });
  const my = useSpring(rawY, { stiffness: 50, damping: 18, mass: 1.2 });
  const [on, setOn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setOn(true), 350);
    return () => clearTimeout(timer);
  }, []);

  const move = (event) => {
    if (reduced || !stage.current) return;
    const box = stage.current.getBoundingClientRect();
    rawX.set(((event.clientX - box.left) / box.width - 0.5) * 2);
    rawY.set(((event.clientY - box.top) / box.height - 0.5) * 2);
  };

  const primary = isAuthenticated ? { to: links.app, label: 'Open Vaultrix' } : { to: links.join, label: 'Join Vaultrix' };

  return (
    <section id="top" onPointerMove={move} className="pf-snap-target relative isolate overflow-hidden border-b border-border pt-24 sm:pt-28">
      <div className="mx-auto grid max-w-[1400px] items-center gap-8 px-5 pb-14 sm:px-8 lg:min-h-[calc(100svh-7rem)] lg:grid-cols-12 lg:pb-16">
        <div className="lg:col-span-6">
          <h1 className="text-[clamp(2.9rem,6.2vw,6.2rem)] font-semibold">
            <span className="block">
              <SplitText text="Every rupee," delay={0.15} />
            </span>
            <span className="block">
              <span className={`pf-outline pf-weight inline-block pb-[0.1em] ${on ? 'is-on' : ''}`}>accounted</span>
              <SplitText text=" for." delay={0.55} />
            </span>
          </h1>

          <motion.p
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9 }}
            className="mt-7 max-w-md text-lg leading-relaxed text-ink/70 sm:text-xl"
          >
            Income, daily expenses and loans in one calm place. Built so your numbers stay yours.
          </motion.p>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.05 }}
            className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5"
          >
            <JoinButton to={primary.to} label={primary.label} size="lg" />
            <GhostLink href="#product" onClick={(event) => { event.preventDefault(); scrollToId('product', reduced); }}>
              See the screens
            </GhostLink>
          </motion.div>

          {!isAuthenticated && (
            <motion.p initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-6 text-sm text-muted">
              Already a member?{' '}
              <Link to={links.login} className="font-medium text-ink underline underline-offset-4">
                Sign in
              </Link>
            </motion.p>
          )}
        </div>

        <div ref={stage} className="relative mx-auto mt-4 aspect-[1/0.9] w-full max-w-[640px] [container-type:inline-size] lg:col-span-6 lg:mt-0 lg:max-w-none">
          <HeroBackdrop />
          <FloatChip label="Salary received" value="+ Rs 163,250" delay={1.8} className="left-[0%] top-[1%]" />
          <FloatChip label="Savings goal" value="51% saved" delay={2.6} className="right-[0%] top-[12%]" />
          <FloatChip label="Loan repaid" value="Rs 18,000" delay={3.4} className="left-[-1%] top-[38%]" />
          <Layer mx={mx} my={my} scroll={lift} depth={-10} float={-6} delay={0.35} className="left-[2%] top-[4%] w-[84%]">
            <LaptopFrame src={screens.heroIncomeDesktop} alt="Vaultrix income streams on a laptop" priority fx={{ text: 'Payslip synced', place: 'right-[4cqw] top-[5cqw]', delay: 1.5 }} />
          </Layer>
          <Layer mx={mx} my={my} scroll={lift} depth={20} float={9} tilt={-3} delay={0.6} className="bottom-[1%] left-[1%] z-20 w-[33%]">
            <TabletFrame src={screens.heroLoansTablet} alt="Vaultrix loans on a tablet" priority fx={{ text: 'Part payment · Rs 18,000', place: 'left-[6cqw] top-[7cqw]', delay: 3.2 }} />
          </Layer>
          <Layer mx={mx} my={my} scroll={lift} depth={12} float={-11} delay={0.85} className="bottom-[0%] left-[46%] z-30 w-[20%]">
            <PhoneFrame src={screens.heroDashboardPhone} alt="Vaultrix dashboard on an iPhone" priority fx={{ text: 'Balance updated', place: 'top-[15cqw] left-0 right-0 mx-auto', delay: 2.4 }} />
          </Layer>
          <Layer mx={mx} my={my} scroll={lift} depth={26} float={8} tilt={3} delay={1.1} className="bottom-[5%] right-[1%] z-20 w-[19%]">
            <AndroidFrame src={screens.heroExpensesPhone} alt="Vaultrix daily expenses on an Android phone" priority fx={{ text: 'Expense added', place: 'top-[14cqw] left-0 right-0 mx-auto', delay: 4 }} />
          </Layer>
        </div>
      </div>

      <div className="border-t border-border">
        <dl className="mx-auto grid max-w-[1400px] grid-cols-3">
          {[
            { value: <CountUp to={4} />, label: 'Screens that work together' },
            { value: <CountUp to={6} />, label: 'Languages, right to left too' },
            { value: '0', label: 'Data shared between organizations' },
          ].map((stat, index) => (
            <div key={stat.label} className={`flex min-w-0 flex-col-reverse justify-end gap-3 px-4 py-6 sm:px-8 sm:py-8 ${index > 0 ? 'border-s border-border' : ''}`}>
              <dt className="pf-mono text-[10px] uppercase leading-snug tracking-[0.14em] text-muted sm:text-[11px]">{stat.label}</dt>
              <dd className="m-0 text-[clamp(2rem,4.8vw,3.6rem)] font-semibold leading-none tracking-tight tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-t border-border bg-surface py-5">
        <div className="mx-auto mb-4 flex max-w-[1400px] flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 sm:px-8">
          <p className="pf-mono text-[10px] uppercase tracking-[0.2em] text-ink">Choose the bank or wallet for every payment</p>
          <p className="text-xs text-muted">You enter it. Nothing is linked to your accounts.</p>
        </div>
        <LogoStrip />
      </div>
    </section>
  );
}

export default Hero;
