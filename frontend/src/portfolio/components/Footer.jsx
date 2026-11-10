import { Link } from 'react-router-dom';
import { ArrowUp, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { languages, links, owner } from '../content.js';
import { JoinButton } from './Buttons.jsx';
import { scrollToId } from './Nav.jsx';

function Footer({ home = true }) {
  const { isAuthenticated } = useAuth();
  const reduced = useAppReducedMotion();
  const primary = isAuthenticated ? { to: links.app, label: 'Open Vaultrix' } : { to: links.join, label: 'Join Vaultrix' };

  const section = (label, id) => ({ label, id });
  const columns = [
    { title: 'Product', items: [section('Dashboard', 'product'), section('Income', 'product'), section('Expenses', 'product'), section('Loans', 'product')] },
    { title: 'Trust', items: [section('How it connects', 'flow'), section('Privacy', 'privacy'), section('Security', 'security')] },
    { title: 'Company', items: [section('Founder', 'founder'), section('Everyday details', 'details')] },
  ];

  const linkClass = 'text-[15px] font-medium text-white/70 outline-none transition hover:text-white focus-visible:underline';

  const renderLink = (item) =>
    home ? (
      <a
        href={`#${item.id}`}
        onClick={(event) => {
          event.preventDefault();
          scrollToId(item.id, reduced);
        }}
        className={linkClass}
      >
        {item.label}
      </a>
    ) : (
      <Link to={`/#${item.id}`} className={linkClass}>
        {item.label}
      </Link>
    );

  return (
    <footer className="relative isolate overflow-hidden bg-ink text-white">
      <div aria-hidden="true" className="pf-gridlines-dark pointer-events-none absolute inset-0 -z-10 mx-auto max-w-[1400px]" />
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-white/15 py-12 sm:py-16">
          <p className="max-w-xl text-[clamp(1.8rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-tight">Ready when you are.</p>
          <JoinButton to={primary.to} label={primary.label} variant="light" size="lg" />
        </div>

        <div className="grid gap-12 py-12 sm:py-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="pf-wordmark text-3xl leading-none">Vaultrix</p>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/60">A clear, private picture of your own money. Income, daily expenses and loans in one place.</p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/80">
              <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
              No data shared between organizations
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:col-span-8">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="pf-mono text-[11px] uppercase tracking-[0.18em] text-white/45">{column.title}</p>
                <ul className="mt-5 space-y-3">
                  {column.items.map((item) => (
                    <li key={`${column.title}-${item.label}`}>{renderLink(item)}</li>
                  ))}
                </ul>
              </nav>
            ))}
            <nav aria-label="Legal">
              <p className="pf-mono text-[11px] uppercase tracking-[0.18em] text-white/45">Legal</p>
              <ul className="mt-5 space-y-3">
                <li>
                  <Link to="/privacy-policy" className={linkClass}>
                    Privacy Policy
                  </Link>
                </li>
                {!isAuthenticated && (
                  <li>
                    <Link to={links.login} className={linkClass}>
                      Sign in
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 py-6">
          <span className="pf-mono text-[11px] uppercase tracking-[0.18em] text-white/45">Available in</span>
          {languages.map((language) => (
            <span key={language} className="text-sm font-medium text-white/70">
              {language}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/15 py-6">
          <p className="text-sm text-white/55">
            &copy; {new Date().getFullYear()} Vaultrix. All rights reserved. Owned by {owner.name}.
          </p>
          <div className="flex items-center gap-5">
            <Link to="/privacy-policy" className="text-sm font-medium text-white/80 hover:text-white">
              Privacy Policy
            </Link>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}
              className="flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm font-medium outline-none transition hover:border-white focus-visible:ring-2 focus-visible:ring-white"
            >
              Back to top <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
