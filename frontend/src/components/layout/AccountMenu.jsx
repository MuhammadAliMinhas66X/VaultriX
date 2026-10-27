import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Loader2, LogOut, MoreVertical, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';

function AccountMenu({ hideSettings = false }) {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const itemClass =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink outline-none transition hover:bg-surface focus-visible:bg-surface';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('nav.accountMenu')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-10 w-10 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-black/[0.04] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40 ${open ? 'bg-black/[0.04] text-ink' : ''}`}
      >
        <MoreVertical className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: reduced ? 0 : 0.14 }}
            className="absolute end-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-border bg-white p-1.5 shadow-xl shadow-black/[0.08]"
          >
            {user && (
              <div className="border-b border-border px-3 pb-2.5 pt-2">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-muted" dir="ltr">
                  {user.email}
                </p>
              </div>
            )}
            <div className="pt-1.5">
              {!hideSettings && (
                <Link to="/settings" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
                  <Settings className="h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
                  {t('settings.title')}
                </Link>
              )}
              <button type="button" role="menuitem" onClick={handleSignOut} disabled={signingOut} className={`${itemClass} disabled:cursor-wait disabled:opacity-70`}>
                {signingOut ? <Loader2 className="h-[18px] w-[18px] animate-spin text-muted" /> : <LogOut className="h-[18px] w-[18px] text-muted" strokeWidth={1.75} />}
                {signingOut ? t('common.signingOut') : t('settings.signOut')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AccountMenu;
