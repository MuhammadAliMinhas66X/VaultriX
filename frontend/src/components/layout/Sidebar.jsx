import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Loader2, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import Logo from '../Logo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';

const EXPANDED_WIDTH = 264;
const COLLAPSED_WIDTH = 76;
const STORAGE_KEY = 'vaultrix.sidebar';

export const useSidebarCollapsed = () => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'collapsed';
    } catch (error) {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? 'collapsed' : 'open');
      } catch (error) {
        return next;
      }
      return next;
    });
  };

  return [collapsed, toggle];
};

function NavItem({ item, active, collapsed, activeId, instant, onNavigate }) {
  const Icon = item.icon;
  const tone = item.danger ? 'text-red-600 hover:text-red-700' : active ? 'text-ink' : 'text-muted hover:text-ink';
  const className = `group relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-wait disabled:opacity-70 ${tone}`;

  const content = (
    <>
      {active && (
        <>
          <motion.span
            layoutId={`${activeId}-bg`}
            transition={instant ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }}
            className={`absolute inset-0 rounded-lg ${item.danger ? 'bg-red-50' : 'bg-black/[0.05]'}`}
          />
          <motion.span
            layoutId={`${activeId}-bar`}
            transition={instant ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }}
            className={`absolute inset-y-2 start-0 w-0.5 rounded-full ${item.danger ? 'bg-red-600' : 'bg-ink'}`}
          />
        </>
      )}
      <span className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center">
        {item.loading ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />}
      </span>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: instant ? 0 : 0.18 }}
            className="relative z-10 overflow-hidden whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {collapsed && (
        <span className="pointer-events-none absolute start-full top-1/2 z-50 ms-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          {item.label}
        </span>
      )}
    </>
  );

  if (item.to) {
    return (
      <Link to={item.to} onClick={onNavigate} aria-current={active ? 'page' : undefined} aria-label={collapsed ? item.label : undefined} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={item.loading}
      onClick={() => {
        item.onSelect?.();
        onNavigate?.();
      }}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={className}
    >
      {content}
    </button>
  );
}

function UserChip({ collapsed }) {
  const { user } = useAuth();
  if (!user) return null;
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-ink">{initial}</span>
      {!collapsed && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
          <span className="block truncate text-xs text-muted" dir="ltr">
            {user.email}
          </span>
        </span>
      )}
    </div>
  );
}

export function SidebarBody({ title, showLogo, items, activeId, footerItems, collapsed, onToggle, onNavigate, onClose, instant }) {
  const { t } = useTranslation();
  const uid = useId();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setEntered(true);
  }, []);

  return (
    <>
      <div className={`flex h-16 shrink-0 items-center border-b border-border ${collapsed ? 'justify-center px-3' : 'justify-between px-5'}`}>
        {!collapsed &&
          (showLogo ? (
            <Logo size="sm" linkTo="/dashboard" />
          ) : (
            <h2 className="truncate text-base font-semibold tracking-tight text-ink">{title}</h2>
          ))}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-black/[0.04] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40 lg:flex"
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.closeMenu')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-black/[0.04] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40 lg:hidden"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>

      <nav aria-label={title || 'Main'} className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={entered || instant ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: instant ? 0 : 0.2, delay: instant ? 0 : index * 0.03 }}
          >
            <NavItem item={item} active={item.id === activeId} collapsed={collapsed} activeId={uid} instant={instant} onNavigate={onNavigate} />
          </motion.div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border px-3 py-3">
        <div className="flex flex-col gap-1">
          {footerItems.map((item) => (
            <NavItem key={item.id} item={item} active={false} collapsed={collapsed} activeId={uid} instant={instant} onNavigate={onNavigate} />
          ))}
        </div>
        <div className="mt-2 border-t border-border pt-2">
          <UserChip collapsed={collapsed} />
        </div>
      </div>
    </>
  );
}

function Sidebar({ collapsed, onToggle, ...rest }) {
  const reduced = useReducedMotion();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 38 }}
      className="sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-e border-border bg-white lg:flex"
    >
      <SidebarBody {...rest} collapsed={collapsed} onToggle={onToggle} instant={Boolean(reduced)} />
    </motion.aside>
  );
}

export default Sidebar;
