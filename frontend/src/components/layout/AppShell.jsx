import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Sidebar, { useSidebarCollapsed } from './Sidebar.jsx';
import BottomNav from './BottomNav.jsx';
import AccountMenu from './AccountMenu.jsx';
import SecureGuard from '../security/SecureGuard.jsx';
import SecureBadge from '../security/SecureBadge.jsx';
import Logo from '../Logo.jsx';
import { readDirection } from '../../utils/direction.js';

function AppShell({ title, showLogo = false, pageTitle, items, activeId, footerItems = [], hideSettingsLink = false, children }) {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const back = footerItems.find((item) => item.to);
  const bodyProps = { title, showLogo, items, activeId, footerItems };
  const dir = readDirection();

  return (
    <div dir="ltr" className="flex min-h-screen bg-surface">
      <Sidebar {...bodyProps} collapsed={collapsed} onToggle={toggleCollapsed} />

      <div dir={dir} className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur sm:px-6">
          {back && (
            <Link
              to={back.to}
              aria-label={back.label}
              className="-ms-2 flex h-10 w-10 items-center justify-center rounded-lg text-ink outline-none transition hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-accent/40 lg:hidden"
            >
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" strokeWidth={1.75} />
            </Link>
          )}
          {!back && showLogo && (
            <span className="lg:hidden">
              <Logo size="sm" linkTo="/dashboard" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <span className={`block truncate text-base font-semibold tracking-tight text-ink lg:hidden ${!back && showLogo ? 'sr-only' : ''}`}>{pageTitle}</span>
            <span className="hidden truncate text-sm font-medium text-muted lg:block">{pageTitle}</span>
          </div>
          <SecureBadge />
          <AccountMenu hideSettings={hideSettingsLink} />
        </header>
        <main className="min-w-0 flex-1 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>
      </div>

      <SecureGuard />
      <BottomNav items={items} activeId={activeId} label={title || pageTitle} />
    </div>
  );
}

export default AppShell;
