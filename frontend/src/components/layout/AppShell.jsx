import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu } from 'lucide-react';
import Sidebar, { SidebarBody, useSidebarCollapsed } from './Sidebar.jsx';
import AccountMenu from './AccountMenu.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';

function AppShell({ title, showLogo = false, pageTitle, items, activeId, footerItems = [], hideSettingsLink = false, children }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const bodyProps = { title, showLogo, items, activeId, footerItems };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar {...bodyProps} collapsed={collapsed} onToggle={toggleCollapsed} />

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            />
            <motion.aside
              key="drawer"
              role="dialog"
              aria-modal="true"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 40 }}
              className="fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl lg:hidden"
            >
              <SidebarBody {...bodyProps} collapsed={false} instant={Boolean(reduced)} onClose={() => setDrawerOpen(false)} onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('nav.openMenu')}
            className="-ms-2 flex h-10 w-10 items-center justify-center rounded-lg text-ink outline-none transition hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-accent/40 lg:hidden"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold tracking-tight text-ink lg:hidden">{pageTitle}</span>
            <span className="hidden truncate text-sm font-medium text-muted lg:block">{pageTitle}</span>
          </div>
          <AccountMenu hideSettings={hideSettingsLink} />
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
