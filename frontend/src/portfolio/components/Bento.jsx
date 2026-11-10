import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import en from '../../i18n/locales/en.js';
import fr from '../../i18n/locales/fr.js';
import es from '../../i18n/locales/es.js';
import ar from '../../i18n/locales/ar.js';
import hi from '../../i18n/locales/hi.js';
import ur from '../../i18n/locales/ur.js';
import { LogoCluster } from './Logos.jsx';
import { Reveal, SectionTag, SplitText } from './ui.jsx';

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
  useEffect(() => {
    if (reduced) return undefined;
    const timer = setInterval(() => setActive((value) => (value + 1) % tiles.length), 1900);
    return () => clearInterval(timer);
  }, [reduced]);
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {tiles.map((tile, index) => {
        const on = index === active;
        return (
          <button
            key={tile.native}
            type="button"
            onClick={() => setActive(index)}
            dir={tile.dir}
            aria-pressed={on}
            className={`relative overflow-hidden rounded-xl border p-3 text-start sm:p-3.5 outline-none transition-colors duration-500 focus-visible:ring-2 focus-visible:ring-ink ${on ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink hover:border-ink/40'}`}
          >
            <span className="block text-xl font-semibold leading-none tracking-tight sm:text-2xl">{tile.native}</span>
            <span className={`mt-3 block text-[12px] leading-snug transition-colors duration-500 ${on ? 'text-white/70' : 'text-muted'}`}>{tile.text}</span>
            {on && <motion.span layoutId="pf-lang-bar" className="absolute inset-x-0 bottom-0 h-[3px] bg-white" />}
          </button>
        );
      })}
    </div>
  );
}

function Devices() {
  const reduced = useAppReducedMotion();
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (reduced) return undefined;
    const timer = setInterval(() => setActive((value) => (value + 1) % 3), 1600);
    return () => clearInterval(timer);
  }, [reduced]);
  const shapes = [
    { label: 'Phone', box: 'h-[4.5rem] w-10 rounded-[0.8rem]' },
    { label: 'Tablet', box: 'h-16 w-14 rounded-[0.6rem]' },
    { label: 'Desktop', box: 'h-12 w-24 rounded-md' },
  ];
  return (
    <div className="flex items-end gap-5">
      {shapes.map((shape, index) => (
        <div key={shape.label} className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ borderColor: active === index ? '#111114' : '#e5e5e7', backgroundColor: active === index ? '#111114' : '#ffffff' }}
            transition={{ duration: 0.5 }}
            className={`border-2 ${shape.box}`}
          >
            <span className={`m-1.5 block h-1 rounded-full ${active === index ? 'bg-white/70' : 'bg-border'}`} />
            <span className={`m-1.5 mt-2 block h-1 w-1/2 rounded-full ${active === index ? 'bg-white/40' : 'bg-border'}`} />
          </motion.div>
          <span className="pf-mono text-[10px] uppercase tracking-[0.14em] text-muted">{shape.label}</span>
        </div>
      ))}
    </div>
  );
}

function Calm() {
  const reduced = useAppReducedMotion();
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (reduced) return undefined;
    const timer = setInterval(() => setOn((value) => !value), 2200);
    return () => clearInterval(timer);
  }, [reduced]);
  return (
    <button type="button" onClick={() => setOn((value) => !value)} aria-pressed={on} className="flex items-center gap-4 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ink">
      <span className={`relative h-9 w-16 rounded-full border-2 border-ink transition-colors duration-500 ${on ? 'bg-ink' : 'bg-white'}`}>
        <motion.span animate={{ x: on ? 28 : 3 }} transition={{ type: 'spring', stiffness: 420, damping: 28 }} className={`absolute top-[3px] h-6 w-6 rounded-full ${on ? 'bg-white' : 'bg-ink'}`} />
      </span>
      <span className="pf-mono text-[11px] uppercase tracking-[0.16em] text-ink">Animations {on ? 'on' : 'off'}</span>
    </button>
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
            <LogoCluster names={['Meezan Bank', 'Habib Bank Limited (HBL)', 'United Bank Limited (UBL)', 'MCB Bank']} />
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
