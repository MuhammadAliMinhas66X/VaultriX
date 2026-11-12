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
    <div className={`relative rounded-[1.1rem] bg-[#202024] p-[4px] shadow-[0_40px_80px_-30px_rgba(17,17,20,0.55)] ring-1 ring-white/10 ${className}`}>
      <span aria-hidden="true" className="absolute -right-[2.5px] top-[20%] h-12 w-[2.5px] rounded-r-sm bg-[#2c2c32]" />
      <span aria-hidden="true" className="absolute -right-[2.5px] top-[31%] h-7 w-[2.5px] rounded-r-sm bg-[#2c2c32]" />
      <div className="relative overflow-hidden rounded-[0.8rem] bg-white">
        <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />
        <span aria-hidden="true" className="absolute left-1/2 top-[7px] h-[9px] w-[9px] -translate-x-1/2 rounded-full bg-[#0c0c0f] ring-[1.5px] ring-black/30" />
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
    <div className={`relative rounded-[1.45rem] bg-[#1c1c20] p-[11px] shadow-[0_40px_80px_-30px_rgba(17,17,20,0.55)] ring-1 ring-white/10 ${className}`}>
      <span aria-hidden="true" className="absolute -top-[2.5px] right-[16%] h-[2.5px] w-10 rounded-t-sm bg-[#2c2c32]" />
      <span aria-hidden="true" className="absolute -right-[2.5px] top-[12%] h-8 w-[2.5px] rounded-r-sm bg-[#2c2c32]" />
      <span aria-hidden="true" className="absolute -right-[2.5px] top-[20%] h-8 w-[2.5px] rounded-r-sm bg-[#2c2c32]" />
      <div className="relative overflow-hidden rounded-[0.75rem] bg-white">
        <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />
      </div>
      <span aria-hidden="true" className="absolute left-1/2 top-[3.5px] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#0b0b0d] ring-1 ring-white/10" />
    </div>
  );
}

export function MonitorFrame({ src, alt, className = '', priority = false }) {
  return (
    <div className={className}>
      <div className="relative rounded-[0.7rem] bg-[#1c1c20] p-[7px] shadow-[0_40px_80px_-34px_rgba(17,17,20,0.5)] ring-1 ring-white/10">
        <div className="relative overflow-hidden rounded-[0.35rem] bg-white">
          <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />
        </div>
        <span aria-hidden="true" className="absolute bottom-[2px] left-1/2 h-[2px] w-1.5 -translate-x-1/2 rounded-full bg-white/30" />
      </div>
      <div className="mx-auto h-[clamp(14px,3.2vw,38px)] w-[15%] bg-gradient-to-b from-[#8f8f97] to-[#d9d9de]" />
      <div className="mx-auto h-[7px] w-[32%] rounded-t-[3px] rounded-b-[8px] bg-gradient-to-b from-[#e4e4e8] to-[#a9a9b1] shadow-[0_14px_24px_-12px_rgba(17,17,20,0.5)]" />
    </div>
  );
}

export function useTicker(count, ms, enabled = true) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => setIndex((value) => (value + 1) % count), ms);
    return () => clearInterval(timer);
  }, [count, ms, enabled]);
  return index;
}

// A section divider: a ruler of fine ticks that draws itself out from a label.
export function Divider({ index, label, dark = false }) {
  const ref = useRef(null);
  const reduced = useAppReducedMotion();
  const seen = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  const show = seen || reduced;
  const grow = (origin) => ({
    initial: reduced ? false : { scaleX: 0 },
    animate: { scaleX: show ? 1 : 0 },
    transition: { duration: 1.1, ease },
    style: { transformOrigin: origin },
  });
  return (
    <div ref={ref} role="separator" aria-label={label} className={dark ? 'text-white' : 'text-ink'}>
      <div className="mx-auto flex max-w-[1400px] items-center gap-5 px-5 py-8 sm:px-8 sm:py-10">
        <motion.span aria-hidden="true" {...grow('right')} className="pf-ruler pf-ruler-left h-[9px] flex-1" />
        <span className={`pf-mono inline-flex shrink-0 items-center gap-2.5 rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.2em] ${dark ? 'border-white/20 text-white/70' : 'border-ink/15 bg-white text-ink/70'}`}>
          <span className={dark ? 'text-white' : 'text-ink'}>{index}</span>
          <span aria-hidden="true" className={`h-1 w-1 rounded-full ${dark ? 'bg-white/60' : 'bg-ink'}`} />
          {label}
        </span>
        <motion.span aria-hidden="true" {...grow('left')} className="pf-ruler pf-ruler-right h-[9px] flex-1" />
      </div>
    </div>
  );
}
