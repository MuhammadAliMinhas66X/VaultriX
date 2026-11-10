import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { owner } from '../content.js';
import { asciiCols, asciiPortrait, asciiRows } from '../ascii.js';
import { ownerPhoto } from '../screens.js';
import { Reveal, SectionTag, Tilt } from './ui.jsx';

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
    <div className="absolute -bottom-7 -right-3 h-28 w-28 sm:-right-9 sm:h-36 sm:w-36">
      <svg viewBox="0 0 160 160" className="pf-spin h-full w-full" aria-hidden="true">
        <defs>
          <path id="pf-circle" d="M80,80 m-62,0 a62,62 0 1,1 124,0 a62,62 0 1,1 -124,0" />
        </defs>
        <circle cx="80" cy="80" r="78" fill="#111114" />
        <text className="pf-mono" fontSize="11.4" fill="#fff" letterSpacing="1.6">
          <textPath href="#pf-circle">{label}</textPath>
        </text>
      </svg>
      <span className="pf-wordmark absolute inset-0 flex items-center justify-center text-3xl text-white sm:text-4xl">V</span>
    </div>
  );
}

function Corner({ className }) {
  return <span aria-hidden="true" className={`absolute h-4 w-4 border-ink ${className}`} />;
}

function PortraitBox() {
  const reduced = useAppReducedMotion();
  const frame = useRef(null);
  const seen = useInView(frame, { once: true, amount: 0.3 });
  const [phase, setPhase] = useState('ascii');
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (!seen) return undefined;
    if (reduced) {
      setPhase('photo');
      return undefined;
    }
    const timer = setTimeout(() => setPhase('photo'), 2600);
    return () => clearTimeout(timer);
  }, [seen, reduced]);

  const showAscii = phase === 'ascii' || hold;
  const ease = [0.76, 0, 0.24, 1];

  return (
    <div
      ref={frame}
      onPointerEnter={() => setHold(true)}
      onPointerLeave={() => setHold(false)}
      onClick={() => setHold((value) => !value)}
      className="relative aspect-[4/5] cursor-pointer select-none overflow-hidden border border-ink bg-surface"
      style={{ containerType: 'size' }}
    >
      {ownerPhoto && <img src={ownerPhoto} alt={owner.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-top" />}

      <motion.pre
        aria-hidden="true"
        initial={reduced ? false : { clipPath: 'inset(0 0 100% 0)' }}
        animate={seen ? { clipPath: showAscii ? 'inset(0 0 0% 0)' : 'inset(100% 0 0 0)' } : { clipPath: 'inset(0 0 100% 0)' }}
        transition={{ duration: showAscii && phase === 'ascii' && !hold ? 2.2 : 1.1, ease }}
        className="pf-mono absolute inset-0 m-0 overflow-hidden bg-white text-ink"
        style={{ fontSize: `calc(100cqw / ${asciiCols * 0.6})`, lineHeight: `calc(100cqh / ${asciiRows})`, letterSpacing: 0, whiteSpace: 'pre' }}
      >
        {asciiPortrait}
      </motion.pre>

      {!reduced && (
        <motion.span
          aria-hidden="true"
          key={showAscii ? 'down' : 'up'}
          initial={{ top: showAscii && phase === 'ascii' && !hold ? '0%' : '100%', opacity: 1 }}
          animate={seen ? { top: showAscii ? ['0%', '100%'] : ['100%', '0%'], opacity: [1, 1, 0] } : { opacity: 0 }}
          transition={{ duration: showAscii && phase === 'ascii' && !hold ? 2.2 : 1.1, ease, times: [0, 0.9, 1] }}
          className="absolute inset-x-0 h-[2px] bg-ink shadow-[0_0_18px_rgba(17,17,20,0.5)]"
        />
      )}

      <Corner className="left-2.5 top-2.5 border-l-2 border-t-2" />
      <Corner className="right-2.5 top-2.5 border-r-2 border-t-2" />
      <Corner className="bottom-2.5 left-2.5 border-b-2 border-l-2" />
      <Corner className="bottom-2.5 right-2.5 border-b-2 border-r-2" />
      <div className="pf-mono absolute bottom-3.5 left-5 right-5 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white mix-blend-difference">
        <span>Fig. 01</span>
        <span>{showAscii ? 'MAM / ascii' : 'MAM / photo'}</span>
      </div>
    </div>
  );
}

function Founder() {
  const nameRef = useRef(null);
  const on = useOn(nameRef);
  const [first, ...rest] = owner.name.split(' ');

  return (
    <section id="founder" className="pf-snap-target relative flex min-h-[100svh] items-center overflow-hidden border-b border-border">
      <div className="pf-focus-body mx-auto grid w-full max-w-[1400px] items-center gap-14 px-5 pb-12 pt-24 sm:px-8 lg:grid-cols-12 lg:pb-8 lg:pt-20">
        <div className="lg:col-span-5">
          <Tilt max={4}>
            <div className="relative mx-auto w-[min(82vw,420px)] lg:w-[min(420px,48vh)]">
              <PortraitBox />
              <Badge />
            </div>
          </Tilt>
        </div>

        <div className="lg:col-span-7">
          <SectionTag index="06" label="Founder" />
          <h2 className="mt-5 text-[clamp(2.3rem,min(5.6vw,8.6vh),5.2rem)] font-semibold">
            <span className="block">Owned by</span>
            <span ref={nameRef} className="block">
              <span className={`pf-outline pf-weight inline-block pb-[0.1em] ${on ? 'is-on' : ''}`}>{first}</span>{' '}
              <span className={`pf-outline pf-weight inline-block pb-[0.1em] ${on ? 'is-on' : ''}`}>{rest.join(' ')}</span>
            </span>
          </h2>
          <div className="mt-7 max-w-xl space-y-4 text-lg leading-relaxed text-ink/70">
            {owner.lines.map((line, index) => (
              <Reveal key={line} delay={0.1 + index * 0.1}>
                <p>{line}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3} className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-5">
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
