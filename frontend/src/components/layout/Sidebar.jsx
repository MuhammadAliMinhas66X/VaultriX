import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, Loader2, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import Logo from '../Logo.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';

const EXPANDED_WIDTH = 264;
const COLLAPSED_WIDTH = 68;
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

function Tooltip({ rect, children }) {
  if (!rect) return null;
  return createPortal(
    <span
      className="pointer-events-none fixed z-[70] -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
      style={{ top: rect.top + rect.height / 2, left: rect.right + 10 }}
    >
      {children}
    </span>,
    document.body
  );
}

function NavItem({ item, active, collapsed, activeId, instant, onNavigate, compact = false }) {
  const Icon = item.icon;
  const ref = useRef(null);
  const [tipRect, setTipRect] = useState(null);
  const tone = item.danger ? 'text-red-600 hover:text-red-700' : active ? 'text-ink' : 'text-muted hover:text-ink';
  const className = `relative flex ${compact ? 'h-9 text-[13px]' : 'h-10 text-sm'} items-center rounded-lg font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-wait disabled:opacity-70 ${collapsed ? 'mx-auto w-10 justify-center' : 'w-full gap-3 px-3'} ${tone}`;
  const spring = instant ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 };

  const showTip = () => collapsed && ref.current && setTipRect(ref.current.getBoundingClientRect());
  const hideTip = () => setTipRect(null);

  const content = (
    <>
      {active && (
        <>
          <motion.span layoutId={`${activeId}-bg`} transition={spring} className={`absolute inset-0 rounded-lg ${item.danger ? 'bg-red-50' : 'bg-black/[0.05]'}`} />
          <motion.span layoutId={`${activeId}-bar`} transition={spring} className={`absolute inset-y-2 start-0 w-0.5 rounded-full ${item.danger ? 'bg-red-600' : 'bg-ink'}`} />
        </>
      )}
      <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
        {item.loading ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" />
        ) : item.mark ? (
          item.mark
        ) : (
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        )}
      </span>
      {!collapsed && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: instant ? 0 : 0.18 }} className="relative z-10 min-w-0 flex-1 truncate text-start">
          {item.label}
        </motion.span>
      )}
      {!collapsed && item.badge !== undefined && (
        <span className="relative z-10 rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted">{item.badge}</span>
      )}
    </>
  );

  const shared = {
    ref,
    className,
    onMouseEnter: showTip,
    onMouseLeave: hideTip,
    onFocus: showTip,
    onBlur: hideTip,
    'aria-current': active ? 'page' : undefined,
    'aria-label': collapsed ? item.label : undefined,
  };

  return (
    <>
      {item.to ? (
        <Link to={item.to} onClick={onNavigate} {...shared}>
          {content}
        </Link>
      ) : (
        <button
          type="button"
          disabled={item.loading}
          onClick={() => {
            item.onSelect?.();
            onNavigate?.();
          }}
          {...shared}
        >
          {content}
        </button>
      )}
      {collapsed && <Tooltip rect={tipRect}>{item.label}</Tooltip>}
    </>
  );
}

const GROUP_KEY = 'vaultrix.sidebar.group';

function Group({ group, activeId, collapsed, uid, instant, onNavigate, onExpandSidebar }) {
  const { t } = useTranslation();
  const Icon = group.icon;
  const ref = useRef(null);
  const navigate = useNavigate();
  const [tipRect, setTipRect] = useState(null);
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(`${GROUP_KEY}.${group.id}`) === 'open';
    } catch (error) {
      return false;
    }
  });

  const setAndSave = (next) => {
    setOpen(next);
    try {
      window.localStorage.setItem(`${GROUP_KEY}.${group.id}`, next ? 'open' : 'closed');
    } catch (error) {
      return;
    }
  };

  const headerTone = group.activeChild ? 'text-ink' : 'text-muted hover:text-ink';
  const arrived = useRef(false);

  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      return;
    }
    if (group.activeChild) setAndSave(true);
  }, [group.activeChild]);

  if (collapsed) {
    return (
      <>
        <button
          ref={ref}
          type="button"
          aria-label={group.label}
          onClick={() => {
            setAndSave(true);
            if (group.to) navigate(group.to);
            onExpandSidebar?.();
          }}
          onMouseEnter={() => ref.current && setTipRect(ref.current.getBoundingClientRect())}
          onMouseLeave={() => setTipRect(null)}
          className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 ${group.activeChild ? 'bg-black/[0.05]' : ''} ${headerTone}`}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
        <Tooltip rect={tipRect}>{group.label}</Tooltip>
      </>
    );
  }

  const spring = instant ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36 };
  const expanded = open;

  return (
    <div className="flex flex-col">
      <div
        className={`group/header relative flex h-10 w-full items-center rounded-lg transition-colors hover:bg-black/[0.03] ${group.activeChild ? 'text-ink' : 'text-muted hover:text-ink'}`}
      >
        <Link
          to={group.to}
          onClick={() => {
            setAndSave(true);
            onNavigate?.();
          }}
          aria-current={group.activeChild && !activeId.startsWith('stream:') ? 'page' : undefined}
          className="relative flex h-10 min-w-0 flex-1 items-center gap-3 rounded-lg ps-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1 truncate text-start">{group.label}</span>
          <span className="rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted">{group.count ?? group.items.length}</span>
        </Link>
        <button
          type="button"
          onClick={() => setAndSave(!open)}
          aria-expanded={expanded}
          aria-label={group.label}
          className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={spring} className="flex">
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={instant ? { duration: 0 } : { height: { type: 'spring', stiffness: 360, damping: 38 }, opacity: { duration: 0.16 } }}
            className="overflow-hidden"
          >
            <div className="relative ms-[1.65rem] mt-1 pb-1 ps-3">
              <motion.span
                aria-hidden="true"
                initial={instant ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: instant ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ originY: 0 }}
                className="absolute inset-y-1 start-0 w-px rounded-full bg-border"
              />
              <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto overflow-x-hidden pe-0.5">
                {group.items.length === 0 && (
                  <Link
                    to={group.to}
                    onClick={onNavigate}
                    className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium text-muted outline-none transition-colors hover:bg-black/[0.04] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                    {t('income.add')}
                  </Link>
                )}
                {group.items.map((item, index) => {
                  const itemActive = item.id === activeId;
                  return (
                    <motion.div
                      key={item.id}
                      className="relative"
                      initial={instant ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 34, delay: instant ? 0 : Math.min(index, 8) * 0.04 }}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute -start-3 top-1/2 h-px w-3 transition-colors ${itemActive ? 'bg-ink' : 'bg-border'}`}
                      />
                      <NavItem item={item} active={itemActive} collapsed={false} activeId={uid} instant={instant} onNavigate={onNavigate} compact />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SidebarBody({ title, showLogo, items, activeId, footerItems, collapsed, onToggle, onNavigate, instant }) {
  const { t } = useTranslation();
  const uid = useId();

  return (
    <>
      <div className={`flex h-14 shrink-0 items-center border-b border-border ${collapsed ? 'justify-center' : 'justify-between ps-5 pe-3'}`}>
        {!collapsed && (showLogo ? <Logo size="sm" linkTo="/dashboard" /> : <h2 className="truncate text-base font-semibold tracking-tight text-ink">{title}</h2>)}
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
      </div>

      <nav aria-label={title || 'Main'} className={`flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden py-3 ${collapsed ? 'px-0' : 'px-3'}`}>
        {items.map((item) =>
          item.type === 'group' ? (
            <Group key={item.id} group={item} activeId={activeId} collapsed={collapsed} uid={uid} instant={instant} onNavigate={onNavigate} onExpandSidebar={onToggle} />
          ) : (
            <NavItem key={item.id} item={item} active={item.id === activeId} collapsed={collapsed} activeId={uid} instant={instant} onNavigate={onNavigate} />
          )
        )}
      </nav>

      {footerItems.length > 0 && (
        <div className={`flex shrink-0 flex-col gap-1 border-t border-border py-3 ${collapsed ? 'px-0' : 'px-3'}`}>
          {footerItems.map((item) => (
            <NavItem key={item.id} item={item} active={false} collapsed={collapsed} activeId={uid} instant={instant} onNavigate={onNavigate} />
          ))}
        </div>
      )}
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
      className="sticky top-0 z-30 hidden h-screen shrink-0 flex-col overflow-hidden border-e border-border bg-white lg:flex"
    >
      <SidebarBody {...rest} collapsed={collapsed} onToggle={onToggle} instant={Boolean(reduced)} />
    </motion.aside>
  );
}

export default Sidebar;
