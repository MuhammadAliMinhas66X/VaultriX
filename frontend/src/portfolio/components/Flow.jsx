import { motion } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { screens } from '../screens.js';
import { PhoneFrame, Reveal, SectionTag, SplitText, Tilt } from './ui.jsx';

const steps = [
  { title: 'Add the expense', body: 'Amount, category and date, the way you always do.' },
  { title: 'Pick who paid', body: 'Yourself, someone already in your Loans, or someone new.' },
  { title: 'The loan appears', body: 'It is created for you and stays in step if you edit or delete the expense.' },
];

function Connector() {
  const reduced = useAppReducedMotion();
  return (
    <div aria-hidden="true" className="relative mx-auto h-16 w-px md:h-px md:w-full md:min-w-[72px]">
      <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none">
        <line x1="0" y1="0" x2="100%" y2="0" className="pf-dash hidden stroke-ink md:block" strokeWidth="1.5" strokeDasharray="4 8" />
        <line x1="0" y1="0" x2="0" y2="100%" className="pf-dash stroke-ink md:hidden" strokeWidth="1.5" strokeDasharray="4 8" />
      </svg>
      {!reduced && (
        <>
          <motion.span className="absolute left-1/2 top-0 hidden h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink max-md:block" animate={{ top: ['0%', '100%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.span className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink max-md:hidden" animate={{ left: ['0%', '100%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
        </>
      )}
    </div>
  );
}

function Flow() {
  return (
    <section id="flow" className="pf-snap-target relative flex min-h-[100svh] items-center border-b border-border bg-surface">
      <div className="pf-focus-body mx-auto grid w-full max-w-[1400px] gap-8 px-5 pb-10 pt-24 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:pb-6 lg:pt-20">
        <div className="lg:col-span-7">
          <SectionTag index="02" label="How it connects" />
          <h2 className="mt-4 text-[clamp(2.1rem,min(4vw,6.4vh),3.9rem)] font-semibold">
            <SplitText text="When someone else pays, Vaultrix remembers." />
          </h2>
          <Reveal delay={0.1} className="mt-4 max-w-xl text-base leading-relaxed text-ink/65 sm:text-lg">
            A friend covers your flight. You record the expense once. The loan is written for you, so nothing is forgotten and nothing is entered twice.
          </Reveal>

          <Reveal delay={0.1} className="mt-6 grid items-center gap-2 md:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-[0_24px_50px_-30px_rgba(17,17,20,0.35)]">
              <p className="pf-mono text-[10px] uppercase tracking-[0.18em] text-muted">Expense</p>
              <p className="mt-3 text-lg font-semibold">Travel</p>
              <p className="text-sm text-muted">Flight ticket</p>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
                <span className="whitespace-nowrap rounded-full border border-ink px-2.5 py-0.5 text-[11px] font-semibold">Paid by Hamza Tariq</span>
                <span className="whitespace-nowrap text-lg font-bold tabular-nums">Rs 18,000.00</span>
              </div>
            </div>

            <Connector />

            <div className="rounded-2xl border border-ink bg-ink p-5 text-white shadow-[0_24px_50px_-30px_rgba(17,17,20,0.6)]">
              <p className="pf-mono text-[10px] uppercase tracking-[0.18em] text-white/55">Recorded in Loans automatically</p>
              <p className="mt-3 text-lg font-semibold">Hamza Tariq</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium">I borrowed</span>
                <span className="rounded-full border border-white/40 px-2.5 py-0.5 text-[11px] font-medium">From an expense</span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <span className="text-xs text-white/60">Left to pay</span>
                <span className="text-lg font-bold tabular-nums">Rs 18,000.00</span>
              </div>
            </div>
          </Reveal>

          <ol className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="bg-white p-4">
                <span className="pf-mono text-[11px] tracking-[0.2em] text-muted">0{index + 1}</span>
                <p className="mt-2 text-base font-semibold leading-tight tracking-tight">{step.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/65">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <Reveal y={60} className="flex justify-center lg:col-span-5">
          <Tilt max={6} className="w-[min(70vw,300px)] lg:w-[min(300px,31vh)]">
            <PhoneFrame src={screens.paidByPhone} alt="Adding an expense paid by someone else, with the Loans preview card" />
          </Tilt>
        </Reveal>
      </div>
    </section>
  );
}

export default Flow;
