import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { links } from '../content.js';
import { JoinButton } from './Buttons.jsx';
import { Marquee, Reveal, SplitText } from './ui.jsx';

function Cta() {
  const { isAuthenticated } = useAuth();
  const reduced = useAppReducedMotion();
  const primary = isAuthenticated ? { to: links.app, label: 'Open Vaultrix' } : { to: links.join, label: 'Create your account' };

  return (
    <section id="join" className="relative isolate scroll-mt-20 overflow-hidden bg-ink text-white">
      <div aria-hidden="true" className="pf-gridlines-dark pointer-events-none absolute inset-0 -z-10 mx-auto max-w-[1400px]" />
      <div className="border-b border-white/15 py-5">
        <Marquee
          items={['Join Vaultrix', 'Join Vaultrix']}
          itemClassName="pf-outline pf-outline-light px-8 text-[clamp(1.6rem,3.6vw,3rem)] font-semibold uppercase tracking-tight after:ms-16 after:content-['+'] after:text-white/40"
        />
      </div>
      <div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-36">
        <p className="pf-mono text-[11px] uppercase tracking-[0.2em] text-white/60">06 / Join</p>
        <h2 className="mt-6 text-[clamp(3.6rem,13vw,12rem)] font-semibold leading-[0.88]">
          <SplitText text="Join" />
          <br />
          <span className="pf-outline pf-outline-light is-on">
            <SplitText text="Vaultrix." delay={0.2} />
          </span>
        </h2>
        <Reveal delay={0.2} className="mt-10 max-w-lg text-lg leading-relaxed text-white/70">
          Set up in a few taps. Pick your country, language and currency, add your first income, and see the whole picture.
        </Reveal>
        <Reveal delay={0.3} className="mt-10 flex flex-wrap items-center gap-6">
          <span className="relative inline-flex">
            {!reduced && <motion.span aria-hidden="true" className="absolute inset-0 rounded-xl border border-white" animate={{ scale: [1, 1.12], opacity: [0.5, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }} />}
            <JoinButton to={primary.to} label={primary.label} variant="light" size="lg" />
          </span>
          {!isAuthenticated && (
            <Link to={links.login} className="text-[15px] font-medium text-white/80 underline underline-offset-4 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-white">
              I already have an account
            </Link>
          )}
        </Reveal>
      </div>
    </section>
  );
}

export default Cta;
