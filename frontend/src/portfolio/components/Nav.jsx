import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { links, nav } from '../content.js';
import { JoinButton } from './Buttons.jsx';
import { Scramble } from './ui.jsx';

export const scrollToId = (id, reduced) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
};

function useActiveSection(ids) {
  const [active, setActive] = useState('');
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    const onScroll = () => {
      if (window.scrollY < 240) setActive('');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [ids]);
  return active;
}

const ids = nav.map((item) => item.id);

function Nav() {
  const { isAuthenticated } = useAuth();
  const reduced = useAppReducedMotion();
  const active = useActiveSection(ids);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (event, id) => {
    event.preventDefault();
    setOpen(false);
    setTimeout(() => scrollToId(id, reduced), open ? 280 : 0);
  };

  const primary = isAuthenticated ? { to: links.app, label: 'Open Vaultrix' } : { to: links.join, label: 'Join Vaultrix' };

  return (
    <>
      <motion.div aria-hidden="true" style={{ scaleX: reduced ? 0 : progress }} className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-ink" />
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled ? 'border-b border-border bg-white/85 py-3 backdrop-blur-xl' : 'border-b border-transparent bg-transparent py-5'
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 sm:px-8">
          <Link to="/" aria-label="Vaultrix home" className="pf-wordmark text-2xl leading-none outline-none focus-visible:ring-2 focus-visible:ring-ink">
            Vaultrix
          </Link>

          <nav aria-label="Sections" className="relative hidden items-center gap-1 lg:flex">
            {nav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(event) => go(event, item.id)}
                className={`relative rounded-full px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink ${active === item.id ? 'text-white' : 'text-ink/70 hover:text-ink'}`}
              >
                {active === item.id && <motion.span layoutId="pf-nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="absolute inset-0 rounded-full bg-ink" />}
                <span className="relative">
                  <Scramble text={item.label} />
                </span>
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {!isAuthenticated && (
              <Link to={links.login} className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink/70 outline-none transition hover:text-ink focus-visible:ring-2 focus-visible:ring-ink sm:block">
                Sign in
              </Link>
            )}
            <span className="hidden sm:block">
              <JoinButton to={primary.to} label={primary.label} size="sm" />
            </span>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-full border border-border bg-white outline-none focus-visible:ring-2 focus-visible:ring-ink lg:hidden"
            >
              <span className="h-px w-5 bg-ink" />
              <span className="h-px w-5 bg-ink" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[70] flex flex-col bg-ink px-6 pb-8 pt-5 text-white"
          >
            <div className="flex items-center justify-between">
              <span className="pf-wordmark text-2xl leading-none">Vaultrix</span>
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 outline-none focus-visible:ring-2 focus-visible:ring-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Sections" className="mt-14 flex flex-1 flex-col justify-center gap-2">
              {nav.map((item, index) => (
                <motion.a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(event) => go(event, item.id)}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 + index * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-baseline gap-4 border-b border-white/15 py-4 text-[clamp(2rem,9vw,3.4rem)] font-semibold leading-none tracking-tight outline-none focus-visible:text-white/70"
                >
                  <span className="pf-mono text-[11px] font-normal tracking-[0.18em] text-white/50">0{index + 1}</span>
                  {item.label}
                </motion.a>
              ))}
            </nav>
            <div className="flex flex-col gap-3 pt-8">
              <JoinButton to={primary.to} label={primary.label} variant="light" size="lg" className="w-full justify-between" />
              {!isAuthenticated && (
                <Link to={links.login} className="py-3 text-center text-[15px] font-medium text-white/80">
                  Already have an account? Sign in
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Nav;
