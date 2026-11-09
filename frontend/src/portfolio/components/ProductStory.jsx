import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Check } from 'lucide-react';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { features } from '../content.js';
import { screens } from '../screens.js';
import { PhoneFrame, Reveal, SectionTag, SplitText, TabletFrame, Tilt, WindowFrame } from './ui.jsx';

function Visual({ id }) {
  if (id === 'dashboard') {
    return (
      <div className="relative mx-auto w-full max-w-[720px]">
        <TabletFrame src={screens.dashboardTablet} alt="Dashboard with the balance card on a tablet" className="w-[88%]" />
        <PhoneFrame src={screens.dashboardPhone} alt="Dashboard with the balance card on a phone" className="absolute -bottom-6 right-0 w-[27%]" />
      </div>
    );
  }
  if (id === 'income') {
    return (
      <div className="mx-auto w-full max-w-[720px]">
        <WindowFrame src={screens.incomeDesktop} alt="Income streams with tax and deductions" />
      </div>
    );
  }
  if (id === 'expenses') {
    return (
      <div className="relative mx-auto w-full max-w-[720px]">
        <WindowFrame src={screens.expensesDesktop} alt="Daily expenses chart and categories" className="w-[88%]" />
        <PhoneFrame src={screens.expensesPhone} alt="Daily expenses on a phone" className="absolute -bottom-6 right-0 w-[27%]" />
      </div>
    );
  }
  return (
    <div className="relative mx-auto w-full max-w-[720px]">
      <WindowFrame src={screens.loansDesktop} alt="Loans with the repayment graph" className="w-[88%]" />
      <PhoneFrame src={screens.loansPhone} alt="Loans on a phone" className="absolute -bottom-6 right-0 w-[27%]" />
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
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setActive(Math.min(features.length - 1, Math.max(0, Math.floor(value * features.length * 0.999))));
  });

  const jump = (index) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (span * (index + 0.5)) / features.length, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <div ref={ref} className="relative hidden lg:block" style={{ height: `${features.length * 90}vh` }}>
      <div className="sticky top-0 flex h-screen items-center">
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
                      <span className={`mt-1 block text-[clamp(2rem,3.4vw,3.2rem)] font-semibold leading-none tracking-tight transition-colors duration-500 ${on ? 'text-ink' : 'text-ink/25 group-hover:text-ink/50'}`}>
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
                          <h3 className="mt-5 max-w-md text-2xl font-semibold leading-tight tracking-tight">{feature.title}</h3>
                          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink/65">{feature.body}</p>
                          <Points points={feature.points} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={features[active].id}
                initial={reduced ? false : { opacity: 0, y: 50, scale: 0.95, filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.97, filter: 'blur(8px)' }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <Tilt max={4}>
                  <Visual id={features[active].id} />
                </Tilt>
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
    <div className="mx-auto max-w-[1400px] space-y-20 px-5 pb-20 sm:px-8 lg:hidden">
      {features.map((feature) => (
        <article key={feature.id} className="border-t border-border pt-8">
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
    <section id="product" className="relative scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-[1400px] px-5 pb-12 pt-20 sm:px-8 sm:pt-28 lg:pb-16">
        <SectionTag index="01" label="The product" />
        <h2 className="mt-6 max-w-4xl text-[clamp(2.6rem,7vw,6rem)] font-semibold">
          <SplitText text="Four screens. One picture of your money." />
        </h2>
        <Reveal delay={0.15} className="mt-6 max-w-xl text-lg leading-relaxed text-ink/65">
          These are the real screens, not mockups. Each one feeds the next, so a number you enter once shows up everywhere it belongs.
        </Reveal>
      </div>
      <StickyStory />
      <StackedStory />
    </section>
  );
}

export default ProductStory;
