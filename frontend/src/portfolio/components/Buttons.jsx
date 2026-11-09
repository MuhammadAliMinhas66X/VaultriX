import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Scramble } from './ui.jsx';

export function JoinButton({ to, label, variant = 'dark', size = 'md', className = '' }) {
  const dark = variant === 'dark';
  const sizing = size === 'lg' ? 'px-8 py-5 text-lg' : size === 'sm' ? 'px-4 py-2.5 text-sm' : 'px-6 py-3.5 text-[15px]';
  return (
    <Link
      to={to}
      className={`group relative inline-flex items-center gap-3 overflow-hidden rounded-xl font-medium outline-none transition-transform duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97] ${sizing} ${
        dark ? 'bg-ink text-white focus-visible:ring-ink' : 'bg-white text-ink focus-visible:ring-white focus-visible:ring-offset-ink'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 origin-bottom scale-y-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-y-100 ${dark ? 'bg-[#2c2c33]' : 'bg-[#e9e9ec]'}`}
      />
      <span className="relative z-10">
        <Scramble text={label} />
      </span>
      <span className="relative z-10 flex h-6 w-6 items-center justify-center overflow-hidden">
        <ArrowUpRight className="absolute h-[18px] w-[18px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-7 group-hover:translate-x-7" />
        <ArrowUpRight className="absolute h-[18px] w-[18px] -translate-x-7 translate-y-7 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 group-hover:translate-y-0" />
      </span>
    </Link>
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
