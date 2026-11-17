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

// Every part of a frame is sized in cqw (1% of the frame's own width), so a
// phone looks the same at 70px wide in the hero as at 400px wide in focus.
const Img = ({ src, alt, priority }) => <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />;

// Life inside a screen: it wakes up with a wipe, a soft scan band sweeps down the glass
// now and then, and a small notification drops in from the top as if something just
// arrived. The picture itself never scales or moves, so it stays sharp. Only used when a
// frame is given `fx`. Reduced motion shows the plain picture.
function ScreenFx({ fx }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.span
        className="absolute inset-0 origin-bottom bg-white"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 0.85, delay: Math.max(0, fx.delay - 0.35), ease: [0.76, 0, 0.24, 1] }}
      />
      <motion.span
        className="absolute inset-x-0 top-0 h-[26%] border-b border-ink/25 bg-gradient-to-b from-transparent to-ink/[0.08]"
        initial={{ y: '-110%', opacity: 0 }}
        animate={{ y: ['-110%', '400%'], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.6, delay: fx.delay + 0.6, repeat: Infinity, repeatDelay: 5.4, ease: 'easeInOut', times: [0, 0.1, 0.85, 1] }}
      />
      <motion.span
        className={`absolute flex w-max items-center gap-[max(1.2cqw,2px)] rounded-full bg-white px-[max(2.4cqw,5px)] py-[max(1.3cqw,3px)] text-[max(2.6cqw,6px)] font-semibold leading-none text-ink shadow-[0_2cqw_5cqw_-1.5cqw_rgba(17,17,20,0.5)] ring-1 ring-black/5 ${fx.place}`}
        initial={{ opacity: 0, y: '-160%', scale: 0.92 }}
        animate={{ opacity: [0, 1, 1, 0], y: ['-160%', '0%', '0%', '-160%'], scale: [0.92, 1, 1, 0.96] }}
        transition={{ duration: 5.5, delay: fx.delay + 1.2, repeat: Infinity, repeatDelay: 2, times: [0, 0.14, 0.8, 1], ease: 'easeOut' }}
      >
        <span className="aspect-square w-[max(1.6cqw,3px)] rounded-full bg-ink" />
        {fx.text}
      </motion.span>
    </span>
  );
}

function Screen({ src, alt, priority, fx }) {
  const reduced = useAppReducedMotion();
  if (!fx || reduced) return <Img src={src} alt={alt} priority={priority} />;
  return (
    <>
      <Img src={src} alt={alt} priority={priority} />
      <ScreenFx fx={fx} />
    </>
  );
}

export function PhoneFrame({ src, alt, className = '', priority = false, fx }) {
  return (
    <div className={`[container-type:inline-size] ${className}`}>
      <div className="relative rounded-[17cqw] bg-ink p-[3.4cqw] shadow-[0_8cqw_16cqw_-6cqw_rgba(17,17,20,0.55)]">
        <span aria-hidden="true" className="absolute -left-[1.1cqw] top-[22cqw] h-[8cqw] w-[1.1cqw] rounded-l-[0.5cqw] bg-ink" />
        <span aria-hidden="true" className="absolute -left-[1.1cqw] top-[34cqw] h-[14cqw] w-[1.1cqw] rounded-l-[0.5cqw] bg-ink" />
        <span aria-hidden="true" className="absolute -right-[1.1cqw] top-[30cqw] h-[18cqw] w-[1.1cqw] rounded-r-[0.5cqw] bg-ink" />
        <div className="relative overflow-hidden rounded-[13.6cqw] bg-white">
          <Screen src={src} alt={alt} priority={priority} fx={fx} />
          <span aria-hidden="true" className="absolute left-1/2 top-[2.6cqw] h-[7.2cqw] w-[28cqw] -translate-x-1/2 rounded-full bg-ink" />
        </div>
      </div>
    </div>
  );
}

export function AndroidFrame({ src, alt, className = '', priority = false, fx }) {
  return (
    <div className={`[container-type:inline-size] ${className}`}>
      <div className="relative rounded-[8cqw] bg-[#202024] p-[2.6cqw] shadow-[0_8cqw_16cqw_-6cqw_rgba(17,17,20,0.55)] ring-1 ring-white/10">
        <span aria-hidden="true" className="absolute -right-[1cqw] top-[24cqw] h-[11cqw] w-[1cqw] rounded-r-[0.4cqw] bg-[#2c2c32]" />
        <span aria-hidden="true" className="absolute -right-[1cqw] top-[40cqw] h-[7cqw] w-[1cqw] rounded-r-[0.4cqw] bg-[#2c2c32]" />
        <div className="relative overflow-hidden rounded-[5.6cqw] bg-white">
          <Screen src={src} alt={alt} priority={priority} fx={fx} />
          <span aria-hidden="true" className="absolute left-1/2 top-[2.8cqw] aspect-square w-[3.6cqw] -translate-x-1/2 rounded-full bg-[#0c0c0f] ring-[0.5cqw] ring-black/30" />
        </div>
      </div>
    </div>
  );
}

export function TabletFrame({ src, alt, className = '', priority = false, fx }) {
  return (
    <div className={`[container-type:inline-size] ${className}`}>
      <div className="relative rounded-[5cqw] bg-[#1c1c20] p-[3.4cqw] shadow-[0_6cqw_12cqw_-5cqw_rgba(17,17,20,0.55)] ring-1 ring-white/10">
        <span aria-hidden="true" className="absolute -top-[0.7cqw] right-[16cqw] h-[0.7cqw] w-[9cqw] rounded-t-[0.3cqw] bg-[#2c2c32]" />
        <span aria-hidden="true" className="absolute -right-[0.7cqw] top-[12cqw] h-[6cqw] w-[0.7cqw] rounded-r-[0.3cqw] bg-[#2c2c32]" />
        <span aria-hidden="true" className="absolute -right-[0.7cqw] top-[20cqw] h-[6cqw] w-[0.7cqw] rounded-r-[0.3cqw] bg-[#2c2c32]" />
        <div className="relative overflow-hidden rounded-[2.2cqw] bg-white">
          <Screen src={src} alt={alt} priority={priority} fx={fx} />
        </div>
        <span aria-hidden="true" className="absolute left-1/2 top-[1.2cqw] aspect-square w-[1cqw] min-w-[2px] -translate-x-1/2 rounded-full bg-[#0b0b0d] ring-1 ring-white/10" />
      </div>
    </div>
  );
}

export function LaptopFrame({ src, alt, className = '', priority = false, fx }) {
  return (
    <div className={`[container-type:inline-size] ${className}`}>
      <div className="relative rounded-t-[2cqw] bg-ink p-[1.5cqw] shadow-[0_5cqw_10cqw_-4cqw_rgba(17,17,20,0.5)]">
        <div className="relative overflow-hidden rounded-[0.8cqw] bg-white">
          <Screen src={src} alt={alt} priority={priority} fx={fx} />
        </div>
        <span aria-hidden="true" className="absolute left-1/2 top-[0.5cqw] aspect-square w-[0.5cqw] min-w-[2px] -translate-x-1/2 rounded-full bg-white/40" />
      </div>
      <div className="relative left-1/2 h-[1.7cqw] min-h-[5px] w-[114%] -translate-x-1/2 rounded-b-[2cqw] bg-gradient-to-b from-[#dcdce0] to-[#a8a8b0] shadow-[0_3cqw_5cqw_-3cqw_rgba(17,17,20,0.5)]">
        <span aria-hidden="true" className="absolute left-1/2 top-0 h-[0.7cqw] min-h-[2px] w-[14cqw] -translate-x-1/2 rounded-b-[0.6cqw] bg-[#8c8c94]" />
      </div>
    </div>
  );
}

export function MonitorFrame({ src, alt, className = '', priority = false }) {
  return (
    <div className={`[container-type:inline-size] ${className}`}>
      <div className="relative rounded-[1.1cqw] bg-[#1c1c20] p-[1cqw] shadow-[0_5cqw_10cqw_-4cqw_rgba(17,17,20,0.5)] ring-1 ring-white/10">
        <div className="relative overflow-hidden rounded-[0.5cqw] bg-white">
          <Img src={src} alt={alt} priority={priority} />
        </div>
        <span aria-hidden="true" className="absolute bottom-[0.3cqw] left-1/2 h-[0.3cqw] min-h-[2px] w-[0.8cqw] -translate-x-1/2 rounded-full bg-white/30" />
      </div>
      <div className="mx-auto h-[5cqw] min-h-[10px] w-[15%] bg-gradient-to-b from-[#8f8f97] to-[#d9d9de]" />
      <div className="mx-auto h-[1.2cqw] min-h-[5px] w-[32%] rounded-t-[0.5cqw] rounded-b-[1.4cqw] bg-gradient-to-b from-[#e4e4e8] to-[#a9a9b1] shadow-[0_2.5cqw_4cqw_-2cqw_rgba(17,17,20,0.5)]" />
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
