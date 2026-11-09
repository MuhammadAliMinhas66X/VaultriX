import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { languages, links, owner } from '../content.js';
import { scrollToId } from './Nav.jsx';

function Footer() {
  const { isAuthenticated } = useAuth();
  const reduced = useAppReducedMotion();
  const go = (event, id) => {
    event.preventDefault();
    scrollToId(id, reduced);
  };
  const columns = [
    {
      title: 'Product',
      items: [
        { label: 'Dashboard', id: 'product' },
        { label: 'Income', id: 'product' },
        { label: 'Expenses', id: 'product' },
        { label: 'Loans', id: 'product' },
      ],
    },
    {
      title: 'Trust',
      items: [
        { label: 'How it connects', id: 'flow' },
        { label: 'Privacy', id: 'privacy' },
        { label: 'Security', id: 'security' },
      ],
    },
    {
      title: 'Company',
      items: [{ label: 'Founder', id: 'founder' }, { label: 'Join Vaultrix', id: 'join' }],
    },
  ];

  return (
    <footer className="relative overflow-hidden bg-white">
      <div className="mx-auto max-w-[1400px] px-5 pt-16 sm:px-8 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="pf-wordmark text-4xl leading-none">Vaultrix</p>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink/65">A clear, private picture of your own money. Income, daily expenses and loans in one place.</p>
            <Link
              to={isAuthenticated ? links.app : links.join}
              className="mt-7 inline-flex rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              {isAuthenticated ? 'Open Vaultrix' : 'Join Vaultrix'}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="pf-mono text-[11px] uppercase tracking-[0.18em] text-muted">{column.title}</p>
                <ul className="mt-5 space-y-3">
                  {column.items.map((item) => (
                    <li key={item.label}>
                      <a href={`#${item.id}`} onClick={(event) => go(event, item.id)} className="text-[15px] font-medium text-ink/80 outline-none transition hover:text-ink focus-visible:underline">
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border py-6">
          <span className="pf-mono text-[11px] uppercase tracking-[0.18em] text-muted">Available in</span>
          {languages.map((language) => (
            <span key={language} className="text-sm font-medium text-ink/70">
              {language}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-6">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} Vaultrix. All rights reserved. Owned by {owner.name}.
          </p>
          <div className="flex items-center gap-5">
            {!isAuthenticated && (
              <Link to={links.login} className="text-sm font-medium text-ink/80 hover:text-ink">
                Sign in
              </Link>
            )}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium outline-none transition hover:border-ink focus-visible:ring-2 focus-visible:ring-ink"
            >
              Back to top <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <svg aria-hidden="true" viewBox="0 0 1000 250" className="pointer-events-none mx-auto mt-4 block h-auto w-full max-w-[1500px] select-none px-5 sm:px-8">
        <text x="0" y="244" textLength="1000" lengthAdjust="spacingAndGlyphs" fontSize="320" className="pf-wordmark" fill="#111114">
          VAULTRIX
        </text>
      </svg>
    </footer>
  );
}

export default Footer;
