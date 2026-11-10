import { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';

const ease = [0.22, 1, 0.36, 1];

export function SplitText({ text, className = '', delay = 0, stagger = 0.07, as: Tag = 'span' }) {
  const ref = useRef(null);
  const reduced = useAppReducedMotion();
  const seen = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  const words = text.split(' ');
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} aria-hidden="true" className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            initial={reduced ? false : { y: '115%', rotate: 4 }}
            animate={seen || reduced ? { y: '0%', rotate: 0 } : { y: '115%', rotate: 4 }}
            transition={{ duration: 0.9, ease, delay: delay + index * stagger }}
          >
            {word}
          </motion.span>
          {index < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </Tag>
  );
}

export function Reveal({ children, className = '', delay = 0, y = 28, as = 'div' }) {
  const ref = useRef(null);
  const reduced = useAppReducedMotion();
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const Component = motion[as];
  return (
    <Component
      ref={ref}
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      animate={seen || reduced ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.85, ease, delay }}
    >
      {children}
    </Component>
  );
}

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+';

export function Scramble({ text, className = '' }) {
  const reduced = useAppReducedMotion();
  const [shown, setShown] = useState(text);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const run = () => {
    if (reduced) return;
    clearInterval(timer.current);
    let frame = 0;
    timer.current = setInterval(() => {
      frame += 1;
      setShown(
        text
          .split('')
          .map((char, index) => (char === ' ' || index < frame / 2 ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join('')
      );
      if (frame / 2 >= text.length) {
        clearInterval(timer.current);
        setShown(text);
      }
    }, 28);
  };

  return (
    <span className={`relative inline-block ${className}`} onMouseEnter={run} onFocus={run}>
      <span className="invisible">{text}</span>
      <span aria-hidden="true" className="absolute inset-0 whitespace-nowrap">
        {shown}
      </span>
    </span>
  );
}

export function CountUp({ to, className = '', duration = 1.6 }) {
  const ref = useRef(null);
  const reduced = useAppReducedMotion();
  const seen = useInView(ref, { once: true });
  const [value, setValue] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!seen || reduced) return undefined;
    const controls = animate(0, to, { duration, ease, onUpdate: (latest) => setValue(Math.round(latest)) });
    return () => controls.stop();
  }, [seen, reduced, to, duration]);
  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

export function Marquee({ items, className = '', itemClassName = '', slow = false, reverse = false }) {
  const doubled = [...items, ...items];
  return (
    <div className={`pf-marquee-wrap overflow-hidden ${className}`}>
      <div className={`pf-marquee flex w-max items-center ${slow ? 'pf-marquee-slow' : ''} ${reverse ? 'pf-marquee-rev' : ''}`}>
        {doubled.map((item, index) => (
          <span key={`${item}-${index}`} className={`shrink-0 ${itemClassName}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Crosshair({ className = '' }) {
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute h-3 w-3 ${className}`}>
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
    </span>
  );
}

export function SectionTag({ index, label, dark = false }) {
  return (
    <div className={`pf-mono flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] ${dark ? 'text-white/60' : 'text-muted'}`}>
      <span className={dark ? 'text-white' : 'text-ink'}>{index}</span>
      <span className={`h-px w-10 ${dark ? 'bg-white/30' : 'bg-ink/30'}`} />
      <span>{label}</span>
    </div>
  );
}

export function Tilt({ children, className = '', max = 7 }) {
  const reduced = useAppReducedMotion();
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 60, damping: 18, mass: 1.2 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const move = (event) => {
    if (reduced || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    px.set((event.clientX - box.left) / box.width);
    py.set((event.clientY - box.top) / box.height);
  };
  const rest = () => {
    px.set(0.5);
    py.set(0.5);
  };
  return (
    <motion.div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={rest}
      style={{ rotateX: reduced ? 0 : rotateX, rotateY: reduced ? 0 : rotateY, transformPerspective: 1200 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PhoneFrame({ src, alt, className = '', priority = false }) {
  return (
    <div className={`relative rounded-[2.4rem] bg-ink p-[7px] shadow-[0_40px_80px_-30px_rgba(17,17,20,0.55)] ${className}`}>
      <span aria-hidden="true" className="absolute -left-[3px] top-24 h-8 w-[3px] rounded-l bg-ink" />
      <span aria-hidden="true" className="absolute -left-[3px] top-36 h-14 w-[3px] rounded-l bg-ink" />
      <span aria-hidden="true" className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r bg-ink" />
      <div className="relative overflow-hidden rounded-[1.95rem] bg-white">
        <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />
        <span aria-hidden="true" className="absolute left-1/2 top-2 h-[18px] w-20 -translate-x-1/2 rounded-full bg-ink" />
      </div>
    </div>
  );
}

export function AndroidFrame({ src, alt, className = '', priority = false }) {
  return (
    <div className={`relative rounded-[1.7rem] bg-[#1b1b1f] p-[5px] shadow-[0_40px_80px_-30px_rgba(17,17,20,0.55)] ring-1 ring-black/30 ${className}`}>
      <span aria-hidden="true" className="absolute -right-[3px] top-24 h-10 w-[3px] rounded-r bg-[#1b1b1f]" />
      <span aria-hidden="true" className="absolute -right-[3px] top-40 h-6 w-[3px] rounded-r bg-[#1b1b1f]" />
      <div className="relative overflow-hidden rounded-[1.3rem] bg-white">
        <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />
        <span aria-hidden="true" className="absolute left-1/2 top-2 h-[11px] w-[11px] -translate-x-1/2 rounded-full bg-[#1b1b1f] ring-2 ring-black/20" />
      </div>
    </div>
  );
}

export function LaptopFrame({ src, alt, className = '', priority = false }) {
  return (
    <div className={className}>
      <div className="relative rounded-t-[1rem] bg-ink p-[8px] pb-[8px] shadow-[0_40px_80px_-34px_rgba(17,17,20,0.5)]">
        <div className="relative overflow-hidden rounded-[0.55rem] bg-white">
          <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />
        </div>
        <span aria-hidden="true" className="absolute left-1/2 top-[2.5px] h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-white/40" />
      </div>
      <div className="relative left-1/2 h-[11px] w-[114%] -translate-x-1/2 rounded-b-[0.9rem] bg-gradient-to-b from-[#dcdce0] to-[#a8a8b0] shadow-[0_18px_30px_-16px_rgba(17,17,20,0.5)]">
        <span aria-hidden="true" className="absolute left-1/2 top-0 h-[4px] w-20 -translate-x-1/2 rounded-b-md bg-[#8c8c94]" />
      </div>
    </div>
  );
}

export function TabletFrame({ src, alt, className = '', priority = false }) {
  return (
    <div className={`rounded-[1.8rem] bg-ink p-2.5 shadow-[0_40px_80px_-30px_rgba(17,17,20,0.55)] ${className}`}>
      <div className="overflow-hidden rounded-[1.25rem] bg-white">
        <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />
      </div>
    </div>
  );
}
