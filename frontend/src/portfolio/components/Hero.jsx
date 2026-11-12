import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { links } from '../content.js';
import { screens } from '../screens.js';
import { JoinButton, GhostLink } from './Buttons.jsx';
import { LogoStrip } from './Logos.jsx';
import { scrollToId } from './Nav.jsx';
import { AndroidFrame, CountUp, LaptopFrame, PhoneFrame, SplitText, TabletFrame } from './ui.jsx';

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

        <div ref={stage} className="relative mx-auto mt-4 aspect-[1/0.9] w-full max-w-[640px] lg:col-span-6 lg:mt-0 lg:max-w-none">
          <Layer mx={mx} my={my} depth={-10} float={-7} delay={0.45} className="left-[2%] top-[4%] w-[84%]">
            <LaptopFrame src={screens.incomeDesktop} alt="Vaultrix income streams on a laptop" priority />
          </Layer>
          <Layer mx={mx} my={my} depth={20} float={9} delay={0.65} className="bottom-[1%] left-0 z-20 w-[39%] -rotate-[5deg]">
            <TabletFrame src={screens.loansTablet} alt="Vaultrix loans on a tablet" priority />
          </Layer>
          <Layer mx={mx} my={my} depth={12} float={-11} delay={0.85} className="bottom-[0%] left-[40%] z-30 w-[22%]">
            <PhoneFrame src={screens.dashboardPhone} alt="Vaultrix dashboard on an iPhone" priority />
          </Layer>
          <Layer mx={mx} my={my} depth={26} float={8} delay={1.05} className="bottom-[6%] right-0 z-20 w-[21%] rotate-[4deg]">
            <AndroidFrame src={screens.expensesPhone} alt="Vaultrix daily expenses on an Android phone" priority />
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
