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

function useActiveSection(ids, enabled) {
  const [active, setActive] = useState('');
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return undefined;
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
  }, [ids, enabled]);
  return active;
}

const ids = nav.map((item) => item.id);

function Nav({ home = true }) {
  const { isAuthenticated } = useAuth();
  const reduced = useAppReducedMotion();
  const active = useActiveSection(ids, home);
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
    if (!home) {
      setOpen(false);
      return;
    }
    event.preventDefault();
    setOpen(false);
    setTimeout(() => scrollToId(id, reduced), open ? 300 : 0);
  };

  const primary = isAuthenticated ? { to: links.app, label: 'Open Vaultrix' } : { to: links.join, label: 'Join Vaultrix' };

  const itemClass = (id) =>
    `relative whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink ${active === id ? 'text-white' : 'text-ink/65 hover:text-ink'}`;

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-5 sm:pt-4">
        <div
          className={`pointer-events-auto relative flex w-full items-center justify-between gap-2 rounded-full border px-2.5 py-2 backdrop-blur-xl transition-all duration-500 sm:px-3 ${
            scrolled ? 'max-w-[1060px] border-ink/10 bg-white/85 shadow-[0_14px_44px_-20px_rgba(17,17,20,0.4)]' : 'max-w-[1180px] border-ink/5 bg-white/55'
          }`}
        >
          <Link to="/" aria-label="Vaultrix home" className="flex items-center gap-2.5 rounded-full py-1 pe-3 ps-1 outline-none focus-visible:ring-2 focus-visible:ring-ink">
            <span className="pf-wordmark flex h-9 w-9 items-center justify-center rounded-full bg-ink text-lg leading-none text-white">V</span>
            <span className="pf-wordmark hidden text-xl leading-none sm:block">Vaultrix</span>
          </Link>

          <nav aria-label="Sections" className="relative hidden items-center lg:flex">
            {nav.map((item) =>
              home ? (
                <a key={item.id} href={`#${item.id}`} onClick={(event) => go(event, item.id)} className={itemClass(item.id)}>
                  {active === item.id && <motion.span layoutId="pf-nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="absolute inset-0 rounded-full bg-ink" />}
                  <span className="relative">
                    <Scramble text={item.label} />
                  </span>
                </a>
              ) : (
                <Link key={item.id} to={`/#${item.id}`} className={itemClass(item.id)}>
                  <span className="relative">
                    <Scramble text={item.label} />
                  </span>
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isAuthenticated && (
              <Link to={links.login} className="hidden whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink/70 outline-none transition hover:text-ink focus-visible:ring-2 focus-visible:ring-ink xl:block">
                Sign in
              </Link>
            )}
            <span className="hidden sm:block">
              <JoinButton to={primary.to} label={primary.label} size="sm" className="!rounded-full" />
            </span>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-full bg-ink outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 lg:hidden"
            >
              <span className="h-px w-4 bg-white" />
              <span className="h-px w-4 bg-white" />
            </button>
          </div>

          <motion.span aria-hidden="true" style={{ scaleX: reduced ? 0 : progress }} className="absolute -bottom-px left-8 right-8 h-[2px] origin-left rounded-full bg-ink" />
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
            <nav aria-label="Sections" className="mt-10 flex flex-1 flex-col justify-center gap-1">
              {nav.map((item, index) => {
                const inner = (
                  <>
                    <span className="pf-mono text-[11px] font-normal tracking-[0.18em] text-white/50">0{index + 1}</span>
                    {item.label}
                  </>
                );
                const props = {
                  initial: { y: 40, opacity: 0 },
                  animate: { y: 0, opacity: 1 },
                  transition: { delay: 0.25 + index * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                  className: 'flex items-baseline gap-4 border-b border-white/15 py-4 text-[clamp(1.9rem,8.4vw,3.2rem)] font-semibold leading-none tracking-tight outline-none focus-visible:text-white/70',
                };
                return home ? (
                  <motion.a key={item.id} href={`#${item.id}`} onClick={(event) => go(event, item.id)} {...props}>
                    {inner}
                  </motion.a>
                ) : (
                  <motion.div key={item.id} {...props}>
                    <Link to={`/#${item.id}`} onClick={() => setOpen(false)} className="flex items-baseline gap-4">
                      {inner}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
            <div className="flex flex-col gap-3 pt-6">
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
