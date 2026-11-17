import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';

const sizes = {
  sm: { pad: 'py-1.5 pl-4 pr-1.5 text-sm', chip: 'h-7 w-7', icon: 'h-4 w-4', travel: 'group-hover:-translate-y-6 group-hover:translate-x-6', rest: '-translate-x-6 translate-y-6' },
  md: { pad: 'py-2 pl-6 pr-2 text-[15px]', chip: 'h-9 w-9', icon: 'h-[18px] w-[18px]', travel: 'group-hover:-translate-y-8 group-hover:translate-x-8', rest: '-translate-x-8 translate-y-8' },
  lg: { pad: 'py-2.5 pl-8 pr-2.5 text-lg', chip: 'h-11 w-11', icon: 'h-5 w-5', travel: 'group-hover:-translate-y-10 group-hover:translate-x-10', rest: '-translate-x-10 translate-y-10' },
};

// The button leans toward the pointer, a soft light follows it, a sheen sweeps
// across on hover and the arrow chip swaps its arrow. Reduced motion keeps only
// the colour change.
export function JoinButton({ to, label, shortLabel, variant = 'dark', size = 'md', className = '' }) {
  const dark = variant === 'dark';
  const look = sizes[size] || sizes.md;
  const reduced = useAppReducedMotion();
  const ref = useRef(null);
  const pull = { stiffness: 240, damping: 18, mass: 0.6 };
  const mx = useSpring(useMotionValue(0), pull);
  const my = useSpring(useMotionValue(0), pull);
  const px = useMotionValue(80);
  const py = useMotionValue(20);
  const glow = useMotionTemplate`radial-gradient(150px circle at ${px}px ${py}px, ${dark ? 'rgba(255,255,255,0.22)' : 'rgba(17,17,20,0.12)'}, transparent 70%)`;

  const move = (event) => {
    if (reduced || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    px.set(x);
    py.set(y);
    mx.set((x - box.width / 2) * 0.14);
    my.set((y - box.height / 2) * 0.24);
  };
  const leave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.span style={reduced ? undefined : { x: mx, y: my }} className="inline-flex">
      <Link
        ref={ref}
        to={to}
        onPointerMove={move}
        onPointerLeave={leave}
        className={`group relative inline-flex items-center gap-4 overflow-hidden rounded-full font-medium outline-none transition-[transform,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.96] ${look.pad} ${
          dark
            ? 'bg-ink text-white shadow-[0_10px_28px_-12px_rgba(17,17,20,0.7)] hover:shadow-[0_18px_40px_-14px_rgba(17,17,20,0.8)] focus-visible:ring-ink'
            : 'bg-white text-ink shadow-[0_10px_28px_-14px_rgba(255,255,255,0.5)] hover:shadow-[0_18px_40px_-14px_rgba(255,255,255,0.55)] focus-visible:ring-white focus-visible:ring-offset-ink'
        } ${className}`}
      >
        <motion.span aria-hidden="true" style={{ backgroundImage: glow }} className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 -left-1/2 w-1/3 -skew-x-[22deg] transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[420%] ${dark ? 'bg-white/20' : 'bg-ink/10'}`}
        />
        <span className="relative z-10 whitespace-nowrap">
          {shortLabel ? (
            <>
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </>
          ) : (
            label
          )}
        </span>
        <span className={`relative z-10 flex shrink-0 items-center justify-center overflow-hidden rounded-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:rotate-[8deg] ${look.chip} ${dark ? 'bg-white text-ink' : 'bg-ink text-white'}`}>
          <ArrowUpRight className={`absolute transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${look.icon} ${look.travel}`} />
          <ArrowUpRight className={`absolute transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${look.icon} ${look.rest} group-hover:translate-x-0 group-hover:translate-y-0`} />
        </span>
      </Link>
    </motion.span>
  );
}

export function GhostLink({ href, children, dark = false, onClick }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`group inline-flex items-center gap-2 text-[15px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${dark ? 'text-white focus-visible:ring-white focus-visible:ring-offset-ink' : 'text-ink focus-visible:ring-ink'}`}
    >
      <span className="relative">
        {children}
        <span className={`absolute -bottom-1 left-0 h-px w-full origin-left scale-x-100 transition-transform duration-500 group-hover:scale-x-0 ${dark ? 'bg-white' : 'bg-ink'}`} />
        <span className={`absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 transition-transform delay-150 duration-500 group-hover:scale-x-100 ${dark ? 'bg-white' : 'bg-ink'}`} />
      </span>
    </a>
  );
}
