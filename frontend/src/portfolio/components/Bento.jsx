import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import en from '../../i18n/locales/en.js';
import fr from '../../i18n/locales/fr.js';
import es from '../../i18n/locales/es.js';
import ar from '../../i18n/locales/ar.js';
import hi from '../../i18n/locales/hi.js';
import ur from '../../i18n/locales/ur.js';
import { LogoPulse } from './Logos.jsx';
import { Reveal, SectionTag, SplitText, useTicker } from './ui.jsx';

const tiles = [
  { native: 'English', dir: 'ltr', text: en['dashboard.inAccount'] },
  { native: 'Français', dir: 'ltr', text: fr['dashboard.inAccount'] },
  { native: 'Español', dir: 'ltr', text: es['dashboard.inAccount'] },
  { native: 'العربية', dir: 'rtl', text: ar['dashboard.inAccount'] },
  { native: 'हिन्दी', dir: 'ltr', text: hi['dashboard.inAccount'] },
  { native: 'اردو', dir: 'rtl', text: ur['dashboard.inAccount'] },
];

function Languages() {
  const reduced = useAppReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return undefined;
    const timer = setInterval(() => setActive((value) => (value + 1) % tiles.length), 2000);
    return () => clearInterval(timer);
  }, [reduced, paused]);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {tiles.map((tile, index) => {
        const on = index === active;
        return (
          <button
            key={tile.native}
            type="button"
            dir={tile.dir}
            onClick={() => setActive(index)}
            className="relative overflow-hidden rounded-xl border border-border bg-white px-4 py-4 text-start outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {on && <motion.span layoutId="pf-lang-active" transition={{ type: 'spring', stiffness: 380, damping: 34 }} className="absolute inset-0 rounded-xl bg-ink" />}
            <span className="relative flex items-start justify-between gap-2">
              <span className={`block text-xl font-semibold transition-colors duration-300 ${on ? 'text-white' : 'text-ink'}`}>{tile.native}</span>
              {tile.dir === 'rtl' && (
                <span className={`pf-mono rounded-full border px-1.5 py-0.5 text-[9px] tracking-[0.14em] transition-colors duration-300 ${on ? 'border-white/40 text-white/80' : 'border-ink/20 text-ink/50'}`}>RTL</span>
              )}
            </span>
            <span className={`relative mt-3 block text-sm transition-colors duration-300 ${on ? 'text-white/80' : 'text-ink/50'}`}>{tile.text}</span>
          </button>
        );
      })}
    </div>
  );
}

const shapes = [
  { label: 'Phone', width: 46, height: 84, radius: 12 },
  { label: 'Tablet', width: 80, height: 84, radius: 10 },
  { label: 'Desktop', width: 132, height: 78, radius: 6 },
];

function Devices() {
  const reduced = useAppReducedMotion();
  const active = useTicker(shapes.length, 2000, !reduced);
  const shape = shapes[active];
  return (
    <div>
      <div className="flex h-[112px] flex-col items-center justify-center">
        <motion.div
          animate={{ width: shape.width, height: shape.height, borderRadius: shape.radius }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="relative flex flex-col gap-1.5 border-2 border-ink bg-white p-2"
        >
          <span className="h-1.5 w-1/2 rounded-full bg-ink" />
          <span className="h-1 w-full rounded-full bg-ink/15" />
          <span className="h-1 w-4/5 rounded-full bg-ink/15" />
          <span className="mt-auto h-4 w-full rounded bg-ink/10" />
        </motion.div>
        <motion.span aria-hidden="true" animate={{ opacity: active === 2 ? 1 : 0, scaleX: active === 2 ? 1 : 0.4 }} transition={{ duration: 0.4 }} className="mt-1 block h-1 w-14 rounded-full bg-ink" />
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        {shapes.map((item, index) => (
          <span
            key={item.label}
            className={`pf-mono rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] transition-colors duration-300 ${index === active ? 'border-ink bg-ink text-white' : 'border-ink/20 text-ink/55'}`}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Calm() {
  const reduced = useAppReducedMotion();
  const [on, setOn] = useState(true);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (reduced || manual) return undefined;
    const timer = setInterval(() => setOn((value) => !value), 2600);
    return () => clearInterval(timer);
  }, [reduced, manual]);

  return (
    <div className="flex shrink-0 items-center gap-5">
      <div aria-hidden="true" className="flex h-9 w-[4.5rem] items-center justify-center gap-1.5 rounded-full bg-surface">
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            className="h-2 w-2 rounded-full bg-ink"
            animate={on && !reduced ? { y: [0, -7, 0] } : { y: 0 }}
            transition={on && !reduced ? { duration: 0.9, repeat: Infinity, delay: dot * 0.14, ease: 'easeInOut' } : { duration: 0.25 }}
          />
        ))}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Animations"
        onClick={() => {
          setManual(true);
          setOn((value) => !value);
        }}
        className={`relative h-9 w-16 shrink-0 rounded-full border outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ink ${on ? 'border-ink bg-ink' : 'border-ink/25 bg-white'}`}
      >
        <motion.span className={`absolute top-1 h-7 w-7 rounded-full shadow ${on ? 'bg-white' : 'bg-ink'}`} animate={{ left: on ? 32 : 4 }} transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
      </button>
      <span className="pf-mono w-[9rem] whitespace-nowrap text-[11px] uppercase tracking-[0.16em] text-ink/70">{on ? 'Animations on' : 'Animations off'}</span>
    </div>
  );
}

const cell = 'rounded-2xl border border-border bg-white p-4 sm:p-5';

function Bento() {
  return (
    <section id="details" className="pf-snap-target relative flex min-h-[100svh] items-center border-b border-border bg-surface">
      <div className="pf-focus-body mx-auto w-full max-w-[1400px] px-5 pb-10 pt-24 sm:px-8 lg:pb-6 lg:pt-20">
        <SectionTag index="05" label="Everyday details" />
        <h2 className="mt-4 max-w-3xl text-[clamp(2.1rem,min(4.2vw,6.6vh),4rem)] font-semibold">
          <SplitText text="Small things that make it yours." />
        </h2>

        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-12">
          <Reveal className={`${cell} md:col-span-2 lg:col-span-7 lg:row-span-2`}>
            <p className="text-xl font-semibold tracking-tight">Six languages</p>
            <p className="mb-4 mt-1 text-sm text-ink/65">The same label, in every language the app speaks. Arabic and Urdu read right to left, the way they should.</p>
            <Languages />
          </Reveal>
          <Reveal delay={0.08} className={`${cell} lg:col-span-5`}>
            <p className="text-xl font-semibold tracking-tight">Your banks, your wallets</p>
            <p className="mb-4 mt-1 text-sm text-ink/65">Pick cash, a bank or a wallet for every payment in and out.</p>
            <LogoPulse names={['Meezan Bank', 'Habib Bank Limited (HBL)', 'United Bank Limited (UBL)', 'MCB Bank']} labels={['Meezan Bank', 'HBL', 'UBL', 'MCB Bank']} />
          </Reveal>
          <Reveal delay={0.12} className={`${cell} lg:col-span-5`}>
            <p className="text-xl font-semibold tracking-tight">Every screen size</p>
            <p className="mb-4 mt-1 text-sm text-ink/65">The same app on a phone, a tablet and a desktop.</p>
            <Devices />
          </Reveal>
          <Reveal delay={0.16} className={`${cell} md:col-span-2 lg:col-span-12`}>
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-xl font-semibold tracking-tight">Calm by choice</p>
                <p className="mt-1.5 max-w-xl text-[15px] text-ink/65">Animations switch off when you ask, or when your device does.</p>
              </div>
              <Calm />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default Bento;
