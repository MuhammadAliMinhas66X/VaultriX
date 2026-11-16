import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { features } from '../content.js';
import { screens } from '../screens.js';
import { AndroidFrame, Divider, LaptopFrame, MonitorFrame, SectionTag, SplitText, TabletFrame, Tilt } from './ui.jsx';

// One device per feature, shown alone and centered so it can be read. The
// size follows --pf-h (the height reserved for the device), so phones,
// tablets and desktops all get the same focus layout.
const stages = {
  dashboard: { device: 'Tablet', width: 'min(100%, calc(var(--pf-h) * 1.03))' },
  income: { device: 'Laptop', width: 'min(100%, calc(var(--pf-h) * 1.38))' },
  expenses: { device: 'Phone', width: 'min(62%, calc(var(--pf-h) * 0.46))' },
  loans: { device: 'Monitor', width: 'min(100%, calc(var(--pf-h) * 1.1))' },
};

function Visual({ id }) {
  let device = null;
  if (id === 'dashboard') device = <TabletFrame src={screens.dashboardTablet} alt="Dashboard with the balance card on a tablet" />;
  else if (id === 'income') device = <LaptopFrame src={screens.incomeDesktop} alt="Income streams with tax and deductions on a laptop" />;
  else if (id === 'expenses') device = <AndroidFrame src={screens.expensesPhone} alt="Daily expenses on an Android phone" />;
  else device = <MonitorFrame src={screens.loansDesktop} alt="Loans with the repayment graph on a monitor" />;
  return (
    <div className="mx-auto" style={{ width: stages[id].width }}>
      {device}
    </div>
  );
}

function Points({ points }) {
  return (
    <ul className="mt-6 space-y-3">
      {points.map((point, index) => (
        <motion.li
          key={point}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + index * 0.08, duration: 0.5 }}
          className="flex items-center gap-3 text-[15px] text-ink/80"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-white">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          {point}
        </motion.li>
      ))}
    </ul>
  );
}

function StickyStory() {
  const ref = useRef(null);
  const reduced = useAppReducedMotion();
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setActive(Math.min(features.length - 1, Math.max(0, Math.floor(value * features.length * 0.999))));
  });

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const jump = useCallback(
    (index) => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const span = el.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + (span * (index + 0.5)) / features.length, behavior: reduced ? 'auto' : 'smooth' });
    },
    [reduced]
  );

  // Down and up arrows (and page keys) step through the four screens while the
  // story is pinned. At the first and last screen the page scrolls on as usual.
  useEffect(() => {
    const onKey = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const down = event.key === 'ArrowDown' || event.key === 'PageDown';
      const up = event.key === 'ArrowUp' || event.key === 'PageUp';
      if (!down && !up) return;
      const el = ref.current;
      if (!el) return;
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const rect = el.getBoundingClientRect();
      if (!(rect.top <= 2 && rect.bottom >= window.innerHeight - 2)) return;
      const next = activeRef.current + (down ? 1 : -1);
      if (next < 0 || next > features.length - 1) return;
      event.preventDefault();
      jump(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump]);

  const stage = stages[features[active].id];
  const current = features[active];

  return (
    <div ref={ref} className="relative" style={{ height: `${features.length * 100}vh` }}>
      <div className="sticky top-0 flex h-[100svh] items-center pb-4 pt-[4.6rem] [--pf-h:36svh] sm:[--pf-h:44svh] lg:pb-6 lg:pt-20 lg:[--pf-h:78svh]">
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-3 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <div className="grid grid-cols-4 gap-1 border-b border-border lg:hidden">
              {features.map((feature, index) => (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => jump(index)}
                  aria-current={index === active}
                  className={`relative pb-2.5 pt-1 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink ${index === active ? 'text-ink' : 'text-ink/35'}`}
                >
                  <span className="pf-mono block text-[9px] tracking-[0.2em]">{feature.index}</span>
                  <span className="block truncate text-[13px] font-semibold sm:text-sm">{feature.name}</span>
                  {index === active && <motion.span layoutId="pf-story-tab" transition={{ type: 'spring', stiffness: 420, damping: 36 }} className="absolute inset-x-1 -bottom-px h-[2px] bg-ink" />}
                </button>
              ))}
            </div>

            <ol className="relative hidden border-l border-border pl-8 lg:block">
              <motion.span
                aria-hidden="true"
                className="absolute -left-px top-0 w-px bg-ink"
                animate={{ height: `${((active + 1) / features.length) * 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 24 }}
              />
              {features.map((feature, index) => {
                const on = index === active;
                return (
                  <li key={feature.id} className="py-3">
                    <button type="button" onClick={() => jump(index)} aria-current={on} className="group block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ink">
                      <span className="pf-mono text-[11px] tracking-[0.2em] text-muted">{feature.index}</span>
                      <span className={`mt-1 block text-[clamp(1.6rem,min(3.2vw,4.6vh),3rem)] font-semibold leading-none tracking-tight transition-colors duration-500 ${on ? 'text-ink' : 'text-ink/25 group-hover:text-ink/50'}`}>
                        {feature.name}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <h3 className="mt-4 max-w-md text-[clamp(1.2rem,2.6vh,1.6rem)] font-semibold leading-tight tracking-tight">{feature.title}</h3>
                          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink/65">{feature.body}</p>
                          <Points points={feature.points} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ol>
            <p className="pf-mono mt-6 hidden items-center gap-2 pl-8 text-[10px] uppercase tracking-[0.18em] text-muted lg:flex">
              <ChevronDown className="h-3.5 w-3.5" />
              Scroll or press the down key
            </p>
          </div>

          <div className="relative flex h-[calc(var(--pf-h)+2rem)] items-center justify-center lg:col-span-7 lg:h-[78svh]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-[2.5rem] bg-[radial-gradient(60%_58%_at_50%_50%,#efeff2_0%,rgba(239,239,242,0)_100%)]" />
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={reduced ? false : { opacity: 0, y: 46, scale: 0.94, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -34, scale: 0.97, filter: 'blur(8px)' }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="flex w-full flex-col items-center"
              >
                <Tilt max={3} className="w-full">
                  <Visual id={current.id} />
                </Tilt>
                <p className="pf-mono mt-4 text-[10px] uppercase tracking-[0.2em] text-muted lg:mt-7">
                  {current.index} / {stage.device}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="min-h-[11rem] lg:hidden">
            <AnimatePresence mode="wait">
              <motion.div key={current.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
                <h3 className="text-xl font-semibold leading-tight tracking-tight">{current.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{current.body}</p>
                <Points points={current.points} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductStory() {
  return (
    <section id="product" className="pf-snap-target relative scroll-mt-20">
      <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-20 sm:px-8 sm:pt-24 lg:pb-8">
        <SectionTag index="01" label="The product" />
        <h2 className="mt-5 max-w-4xl text-[clamp(2.4rem,5.6vw,5rem)] font-semibold">
          <SplitText text="Four screens. One picture of your money." />
        </h2>
      </div>
      <StickyStory />
      <Divider index="02" label="How it connects" />
    </section>
  );
}

export default ProductStory;
