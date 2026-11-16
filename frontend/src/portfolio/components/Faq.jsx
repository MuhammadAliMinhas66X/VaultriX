import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { Reveal, SectionTag, SplitText } from './ui.jsx';

const ease = [0.22, 1, 0.36, 1];

const questions = [
  {
    q: 'Is my data private?',
    a: 'Yes. Every organization is its own sealed space. Nothing is shared between organizations: not totals, not names, not a single entry.',
  },
  {
    q: 'Does Vaultrix connect to my bank?',
    a: 'No. You add what you receive and what you spend yourself, so nothing is linked to your bank accounts or wallets.',
  },
  {
    q: 'Which currencies can I use?',
    a: 'Twenty-seven currencies, the same list in onboarding, income, expenses, bills and loans. Amounts in other currencies are converted at live rates.',
  },
  {
    q: 'Can I use it in my language?',
    a: 'English, Français, Español, العربية, हिन्दी and اردو. Arabic and Urdu read right to left, the way they should.',
  },
  {
    q: 'How is tax on my salary worked out?',
    a: 'For supported countries Vaultrix estimates tax and deductions from their published rules, so your balance shows the money that actually reaches you. It is an estimate, not tax advice.',
  },
  {
    q: 'What happens when I delete my account?',
    a: 'Delete means delete. When the last member leaves an organization, its data goes with it.',
  },
];

function Item({ item, index, open, onToggle, reduced }) {
  return (
    <li className="border-b border-border">
      <button type="button" onClick={onToggle} aria-expanded={open} className="group flex w-full items-center gap-5 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ink sm:py-6">
        <span className="pf-mono w-7 shrink-0 text-[11px] tracking-[0.18em] text-muted">{String(index + 1).padStart(2, '0')}</span>
        <span className={`flex-1 text-[clamp(1.05rem,2.2vw,1.45rem)] font-semibold leading-snug tracking-tight transition-colors duration-300 ${open ? 'text-ink' : 'text-ink/60 group-hover:text-ink'}`}>{item.q}</span>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${open ? 'border-ink bg-ink text-white' : 'border-ink/20 text-ink group-hover:border-ink'}`}>
          <motion.span animate={{ rotate: open ? 135 : 0 }} transition={{ duration: reduced ? 0 : 0.4, ease }} className="flex">
            <Plus className="h-4 w-4" strokeWidth={2} />
          </motion.span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-6 ps-12 text-base leading-relaxed text-ink/65 sm:pb-7">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Faq() {
  const reduced = useAppReducedMotion();
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="pf-snap-target relative flex min-h-[100svh] items-center border-b border-border">
      <div className="pf-focus-body mx-auto grid w-full max-w-[1400px] gap-12 px-5 pb-14 pt-24 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:pb-10 lg:pt-20">
        <div className="lg:col-span-5">
          <SectionTag index="06" label="Questions" />
          <h2 className="mt-5 text-[clamp(2.4rem,5.4vw,4.8rem)] font-semibold leading-[0.98]">
            <SplitText text="Questions, answered." />
          </h2>
          <Reveal delay={0.15} className="mt-6 max-w-sm text-lg leading-relaxed text-ink/65">
            The things people ask before they join. Tap one to open it.
          </Reveal>
        </div>
        <Reveal delay={0.1} className="lg:col-span-7">
          <ul className="border-t border-border">
            {questions.map((item, index) => (
              <Item key={item.q} item={item} index={index} open={open === index} onToggle={() => setOpen(open === index ? -1 : index)} reduced={reduced} />
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

export default Faq;
