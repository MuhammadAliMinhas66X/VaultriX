// Shared left-sidebar layout for the signed-in "money" pages (Dashboard,
// Income). Desktop gets a persistent column; mobile gets a top bar with a
// hamburger that opens the same nav as a slide-in drawer - one component,
// two renders of the same markup, so the nav list only has to be
// maintained in one place.
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { resolveAvatarUrl, initialsFromName } from '../utils/avatar.js';
import Logo from './Logo.jsx';
import { ADMIN_EMAIL } from './RequireAdmin.jsx';

function AppShell({ children }) {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarSrc = resolveAvatarUrl(user?.avatarUrl);
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const navItems = [
    { to: '/dashboard', label: t('nav.dashboard') },
    { to: '/income', label: t('nav.income') },
    { to: '/settings', label: t('nav.settings') },
  ];

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const linkClass = ({ isActive }) =>
    `flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-ink text-white' : 'text-muted hover:bg-surface hover:text-ink'
    }`;

  const navContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo size="sm" linkTo="/dashboard" />
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink lg:hidden"
          aria-label={t('common.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setMobileOpen(false)} end>
            {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink to="/admin" className={linkClass} onClick={() => setMobileOpen(false)}>
            {t('nav.admin')}
          </NavLink>
        )}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          to="/settings"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-surface"
        >
          {avatarSrc && !avatarFailed ? (
            <img
              src={avatarSrc}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-medium text-white">
              {initialsFromName(user?.name)}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{user?.name}</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-muted transition hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {signingOut ? t('common.signingOut') : t('settings.signOut')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop: persistent column */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-white lg:block">{navContent}</aside>

      {/* Mobile: slide-in drawer over a backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">{navContent}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile: top bar with menu toggle */}
        <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3 lg:hidden">
          <Logo size="sm" linkTo="/dashboard" />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-ink hover:bg-surface"
            aria-label={t('common.menu')}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
