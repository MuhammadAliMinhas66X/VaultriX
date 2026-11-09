import { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { owner } from '../content.js';
import { ownerPhoto } from '../screens.js';
import { Reveal, SectionTag, Tilt } from './ui.jsx';
import { useEffect, useState } from 'react';

function useOn(ref) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      setOn(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setOn(true), { threshold: 0.4 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return on;
}

function Badge() {
  const label = `${owner.name.toUpperCase()}  *  FOUNDER  *  VAULTRIX  *  `;
  return (
    <div className="absolute -bottom-8 -right-4 h-32 w-32 sm:-right-10 sm:h-40 sm:w-40">
      <svg viewBox="0 0 160 160" className="pf-spin h-full w-full" aria-hidden="true">
        <defs>
          <path id="pf-circle" d="M80,80 m-62,0 a62,62 0 1,1 124,0 a62,62 0 1,1 -124,0" />
        </defs>
        <circle cx="80" cy="80" r="78" fill="#111114" />
        <text className="pf-mono" fontSize="11.4" fill="#fff" letterSpacing="1.6">
          <textPath href="#pf-circle">{label}</textPath>
        </text>
      </svg>
      <span className="pf-wordmark absolute inset-0 flex items-center justify-center text-4xl text-white">V</span>
    </div>
  );
}

function Founder() {
  const reduced = useAppReducedMotion();
  const frame = useRef(null);
  const nameRef = useRef(null);
  const on = useOn(nameRef);
  const shown = useInView(frame, { once: true, amount: 0.15 });
  const { scrollYProgress } = useScroll({ target: frame, offset: ['start end', 'end start'] });
  const shift = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);
  const [first, ...rest] = owner.name.split(' ');

  return (
    <section id="founder" className="relative scroll-mt-20 overflow-hidden border-b border-border">
      <div className="mx-auto grid max-w-[1400px] items-center gap-16 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Tilt max={5}>
            <div ref={frame} className="relative mx-auto w-[min(84vw,430px)]">
              <motion.div
                initial={reduced ? false : { clipPath: 'inset(100% 0 0 0)' }}
                animate={shown || reduced ? { clipPath: 'inset(0% 0 0 0)' } : { clipPath: 'inset(100% 0 0 0)' }}
                transition={{ duration: 1.3, ease: [0.76, 0, 0.24, 1] }}
                className="relative aspect-[4/5] overflow-hidden border border-ink bg-surface"
              >
                {ownerPhoto ? (
                  <motion.img src={ownerPhoto} alt={owner.name} loading="lazy" decoding="async" style={{ y: reduced ? 0 : shift, scale: 1.14 }} className="h-full w-full object-cover" />
                ) : (
                  <div className="pf-gridlines relative flex h-full w-full items-center justify-center">
                    <span className="pf-outline is-on text-[7.5rem] font-semibold leading-none tracking-tighter sm:text-[9rem]">MAM</span>
                  </div>
                )}
                <span aria-hidden="true" className="pf-mono absolute left-3 top-3 text-[10px] uppercase tracking-[0.18em] text-ink/70 mix-blend-difference">
                  Fig. 01
                </span>
              </motion.div>
              <Badge />
            </div>
          </Tilt>
        </div>

        <div className="lg:col-span-7">
          <SectionTag index="05" label="Founder" />
          <h2 className="mt-6 text-[clamp(2.4rem,6.2vw,5.6rem)] font-semibold">
            <span className="block">Owned by</span>
            <span ref={nameRef} className="block">
              <span className={`pf-outline pf-weight inline-block pb-[0.1em] ${on ? 'is-on' : ''}`}>{first}</span>{' '}
              <span className={`pf-outline pf-weight inline-block pb-[0.1em] ${on ? 'is-on' : ''}`}>{rest.join(' ')}</span>
            </span>
          </h2>
          <div className="mt-8 max-w-xl space-y-4 text-lg leading-relaxed text-ink/70">
            {owner.lines.map((line, index) => (
              <Reveal key={line} delay={0.1 + index * 0.1}>
                <p>{line}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3} className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-6">
            <p className="pf-mono text-[11px] uppercase tracking-[0.18em] text-muted">{owner.role}</p>
            {owner.email && (
              <a href={`mailto:${owner.email}`} className="text-[15px] font-medium underline underline-offset-4">
                {owner.email}
              </a>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default Founder;
