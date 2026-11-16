import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { links, nav } from '../content.js';
import { JoinButton } from './Buttons.jsx';

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
  const [hover, setHover] = useState(null);
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
    `relative isolate whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ink ${active === id || hover === id ? 'text-ink' : 'text-ink/55'}`;

  const pill = (id) =>
    hover === id && <motion.span layoutId="pf-nav-hover" transition={{ type: 'spring', stiffness: 460, damping: 34 }} className="absolute inset-0 -z-10 rounded-full bg-ink/[0.07]" />;
  const dot = (id) =>
    active === id && <span aria-hidden="true" className="absolute bottom-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-ink" />;

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-5 sm:pt-4">
        <div
          className={`pointer-events-auto relative flex w-full items-center justify-between gap-2 rounded-full border px-2.5 py-2 transition-all duration-500 sm:px-3 ${
            scrolled
              ? 'max-w-[1060px] border-white/70 bg-white/55 shadow-[0_18px_50px_-24px_rgba(17,17,20,0.5),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl backdrop-saturate-150'
              : 'max-w-[1180px] border-white/50 bg-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md'
          }`}
        >
          <Link to="/" aria-label="Vaultrix home" className="flex items-center rounded-full px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ink">
            <span className="pf-wordmark text-[1.4rem] leading-none">Vaultrix</span>
          </Link>

          <nav aria-label="Sections" onMouseLeave={() => setHover(null)} className="relative hidden items-center lg:flex">
            {nav.map((item) =>
              home ? (
                <a key={item.id} href={`#${item.id}`} onClick={(event) => go(event, item.id)} onMouseEnter={() => setHover(item.id)} onFocus={() => setHover(item.id)} className={itemClass(item.id)}>
                  {pill(item.id)}
                  {item.label}
                  {dot(item.id)}
                </a>
              ) : (
                <Link key={item.id} to={`/#${item.id}`} onMouseEnter={() => setHover(item.id)} onFocus={() => setHover(item.id)} className={itemClass(item.id)}>
                  {pill(item.id)}
                  {item.label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Nav;
