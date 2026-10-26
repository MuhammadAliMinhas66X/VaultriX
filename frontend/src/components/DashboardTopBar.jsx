// Replaces the old sidebar - per feedback, Dashboard is one page again
// (Income lives inside it now, not a separate route), so a full sidebar
// nav had nothing left to navigate to. Settings, Admin (admin only) and
// sign out all live behind one three-dot menu in the top right instead.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, LogOut, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import Logo from './Logo.jsx';
import { ADMIN_EMAIL } from './RequireAdmin.jsx';

function DashboardTopBar() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef(null);
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const itemClass = 'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink transition hover:bg-surface';

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Logo size="sm" linkTo="/dashboard" />

      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('common.moreOptions')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
        >
          <MoreVertical className="h-5 w-5" />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg"
          >
            <Link to="/settings" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <SettingsIcon className="h-4 w-4 shrink-0 text-muted" />
              {t('settings.title')}
            </Link>
            {isAdmin && (
              <Link to="/admin" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
                <ShieldCheck className="h-4 w-4 shrink-0 text-muted" />
                {t('nav.admin')}
              </Link>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className={`${itemClass} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <LogOut className="h-4 w-4 shrink-0 text-muted" />
              {signingOut ? t('common.signingOut') : t('settings.signOut')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default DashboardTopBar;
