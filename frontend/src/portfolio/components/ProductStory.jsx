import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { features } from '../content.js';
import { screens } from '../screens.js';
import { AndroidFrame, Divider, LaptopFrame, MonitorFrame, Reveal, SectionTag, SplitText, TabletFrame, Tilt } from './ui.jsx';

// One device per feature, shown alone and centered so it can be read.
const stages = {
  dashboard: { device: 'Tablet', width: 'min(100%, 80vh)' },
  income: { device: 'Laptop', width: 'min(100%, 108vh)' },
  expenses: { device: 'Phone', width: 'min(62%, 36vh)' },
  loans: { device: 'Monitor', width: 'min(100%, 86vh)' },
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

  return (
    <div ref={ref} className="relative hidden lg:block" style={{ height: `${features.length * 100}vh` }}>
      <div className="sticky top-0 flex h-[100svh] items-center pb-6 pt-20">
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-12 items-center gap-12 px-8">
          <div className="col-span-5">
            <ol className="relative border-l border-border pl-8">
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
            <p className="pf-mono mt-6 flex items-center gap-2 pl-8 text-[10px] uppercase tracking-[0.18em] text-muted">
              <ChevronDown className="h-3.5 w-3.5" />
              Scroll or press the down key
            </p>
          </div>

          <div className="relative col-span-7 flex h-[78svh] items-center justify-center">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-[2.5rem] bg-[radial-gradient(60%_58%_at_50%_50%,#efeff2_0%,rgba(239,239,242,0)_100%)]" />
            <AnimatePresence mode="wait">
              <motion.div
                key={features[active].id}
                initial={reduced ? false : { opacity: 0, y: 46, scale: 0.94, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -34, scale: 0.97, filter: 'blur(8px)' }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="flex w-full flex-col items-center"
              >
                <Tilt max={3} className="w-full">
                  <Visual id={features[active].id} />
                </Tilt>
                <p className="pf-mono mt-7 text-[10px] uppercase tracking-[0.2em] text-muted">
                  {features[active].index} / {stage.device}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function StackedStory() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-10 sm:px-8 lg:hidden">
      {features.map((feature) => (
        <article key={feature.id} className="flex min-h-[86svh] flex-col justify-center border-t border-border py-10">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="pf-mono text-[11px] tracking-[0.2em] text-muted">{feature.index}</p>
              <h3 className="mt-2 text-[clamp(2.2rem,8vw,3.2rem)] font-semibold leading-[0.95] tracking-tight">{feature.name}</h3>
              <p className="mt-4 text-xl font-medium leading-snug tracking-tight">{feature.title}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink/65">{feature.body}</p>
              <ul className="mt-5 space-y-2.5">
                {feature.points.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-[15px] text-ink/80">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <Reveal y={50} className="pb-8">
              <Visual id={feature.id} />
            </Reveal>
          </div>
        </article>
      ))}
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
        <Reveal delay={0.15} className="mt-6 max-w-xl text-lg leading-relaxed text-ink/65">
          These are the real screens, not mockups. Each one feeds the next, so a number you enter once shows up everywhere it belongs.
        </Reveal>
      </div>
      <StickyStory />
      <StackedStory />
      <Divider index="02" label="How it connects" />
    </section>
  );
}

export default ProductStory;
