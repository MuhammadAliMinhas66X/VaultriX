import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { PAKISTANI_BANKS, DIGITAL_WALLETS } from '../../utils/paymentBrands.js';
import { links } from '../content.js';
import { screens } from '../screens.js';
import { JoinButton, GhostLink } from './Buttons.jsx';
import { scrollToId } from './Nav.jsx';
import { Crosshair, CountUp, Marquee, PhoneFrame, SplitText, TabletFrame } from './ui.jsx';

const short = (name) => name.match(/\(([^)]+)\)/)?.[1] || name;
const places = ['Cash', ...PAKISTANI_BANKS.map((bank) => short(bank.name)), ...DIGITAL_WALLETS.map((wallet) => short(wallet.name))];

function Layer({ children, className, depth, mx, my, float, delay }) {
  const reduced = useAppReducedMotion();
  const x = useTransform(mx, (value) => value * depth);
  const y = useTransform(my, (value) => value * depth);
  return (
    <motion.div style={{ x: reduced ? 0 : x, y: reduced ? 0 : y }} className={`absolute ${className}`}>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 60, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div animate={reduced ? undefined : { y: [0, float, 0] }} transition={{ duration: 7 + Math.abs(float) / 2, repeat: Infinity, ease: 'easeInOut' }}>
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function Hero() {
  const { isAuthenticated } = useAuth();
  const reduced = useAppReducedMotion();
  const stage = useRef(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
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
    <section id="top" onPointerMove={move} className="relative isolate overflow-hidden border-b border-border pt-28 sm:pt-32">
      <div aria-hidden="true" className="pf-gridlines pf-fade-y pointer-events-none absolute inset-0 -z-10 mx-auto max-w-[1400px]" />
      <Crosshair className="left-[calc(50%-700px+2rem)] top-28 hidden text-ink/40 min-[1500px]:block" />

      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-12 lg:pb-24">
        <div className="lg:col-span-7">
          <motion.p
            initial={reduced ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="pf-mono mb-7 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-muted"
          >
            <span className="pf-blink inline-block h-1.5 w-1.5 rounded-full bg-ink" />
            Private money tracking
          </motion.p>

          <h1 className="text-[clamp(2.9rem,6.9vw,6.8rem)] font-semibold">
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
            className="mt-8 max-w-xl text-lg leading-relaxed text-ink/70 sm:text-xl"
          >
            Income, daily expenses and loans in one calm place. Built so your numbers stay yours.
          </motion.p>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.05 }}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5"
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

        <div ref={stage} className="relative mx-auto mt-6 aspect-[1/1.08] w-full max-w-[560px] sm:max-w-[640px] lg:col-span-5 lg:mt-0 lg:max-w-none">
          <Layer mx={mx} my={my} depth={-14} float={-8} delay={0.5} className="left-0 top-[16%] w-[74%] -rotate-[4deg]">
            <TabletFrame src={screens.dashboardTablet} alt="Vaultrix dashboard on a tablet" priority />
          </Layer>
          <Layer mx={mx} my={my} depth={22} float={10} delay={0.7} className="right-0 top-[3%] w-[31%] rotate-[5deg]">
            <PhoneFrame src={screens.expensesPhone} alt="Vaultrix daily expenses on a phone" priority />
          </Layer>
          <Layer mx={mx} my={my} depth={10} float={-12} delay={0.9} className="left-[33%] top-0 z-10 w-[37%]">
            <PhoneFrame src={screens.dashboardPhone} alt="Vaultrix dashboard on a phone" priority />
          </Layer>
          <motion.div
            aria-hidden="true"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
            className="pf-mono absolute -left-1 bottom-[6%] z-20 hidden items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-ink sm:flex"
          >
            <span className="h-px w-10 bg-ink" />
            Balance card, live
          </motion.div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto grid max-w-[1400px] grid-cols-3 divide-x divide-border px-0">
          {[
            { value: <CountUp to={4} />, label: 'Screens that work together' },
            { value: <CountUp to={6} />, label: 'Languages, right to left too' },
            { value: '0', label: 'Data shared between organizations' },
          ].map((stat) => (
            <div key={stat.label} className="px-4 py-6 sm:px-8 sm:py-8">
              <p className="text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-none tracking-tight tabular-nums">{stat.value}</p>
              <p className="pf-mono mt-3 text-[10px] uppercase leading-snug tracking-[0.14em] text-muted sm:text-[11px]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border bg-surface py-4">
        <p className="pf-mono mx-auto mb-3 max-w-[1400px] px-5 text-[10px] uppercase tracking-[0.2em] text-muted sm:px-8">Works with the places your money lives</p>
        <Marquee items={places} slow itemClassName="px-6 text-2xl font-semibold tracking-tight text-ink/80 sm:text-3xl" />
      </div>
    </section>
  );
}

export default Hero;
