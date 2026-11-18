import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// One card header for every Dashboard section: dark icon tile, bold title, optional "View all" pill.
export default function Section({ icon: Icon, title, to, linkLabel, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-border bg-white ${className}`} aria-label={title}>
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <h2 className="flex min-w-0 items-center gap-3 text-base font-bold tracking-tight text-ink">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ink to-[#3a3a42] text-white shadow-sm"><Icon className="h-[18px] w-[18px]" strokeWidth={2} /></span>
          <span className="truncate">{title}</span>
        </h2>
        {to && (
          <Link to={to} className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-sm font-semibold text-ink transition hover:bg-border/60">
            {linkLabel} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
