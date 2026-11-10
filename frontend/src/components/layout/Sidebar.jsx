import { readDirection } from '../../utils/direction.js';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronsLeft, Loader2 } from 'lucide-react';
import Logo from '../Logo.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';

const EXPANDED_WIDTH = 264;
const COLLAPSED_WIDTH = 72;
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

const ROW = 'nav-hover group/row relative flex w-full items-center overflow-hidden rounded-lg outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-wait disabled:opacity-70';
const ICON = 'h-5 w-5';

// Active marker: top-level rows get a solid ink pill (same black as the primary
// buttons and the balance card); child rows get a soft tint. It glides between rows.
function ActiveMark({ uid, instant, danger = false, compact = false }) {
  const spring = instant ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 };
  const color = danger ? 'bg-red-50' : compact ? 'bg-black/[0.06]' : 'bg-ink shadow-[0_6px_14px_-6px_rgba(17,17,20,0.55)]';
  return <motion.span layoutId={`${uid}-${compact ? 'soft' : 'bg'}`} transition={spring} className={`absolute inset-0 rounded-lg ${color}`} />;
}

function Label({ collapsed, instant, children }) {
  return (
    <span aria-hidden={collapsed || undefined} className={`relative z-10 min-w-0 flex-1 truncate text-start ${instant ? '' : 'transition-opacity duration-150'} ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
      {children}
    </span>
  );
}

function NavItem({ item, active, collapsed, activeId, instant, onNavigate, compact = false }) {
  const Icon = item.icon;
  const ref = useRef(null);
  const [tipRect, setTipRect] = useState(null);
  const tone = item.danger
    ? 'text-red-600 hover:text-red-700'
    : item.back
      ? 'group text-ink hover:bg-black/[0.05] active:bg-black/[0.08]'
      : active
        ? compact
          ? 'font-semibold text-ink'
          : 'font-semibold text-white'
        : 'text-ink/65 hover:bg-black/[0.05] hover:text-ink';
  const nudge = item.back && !instant ? 'transition-transform duration-200 ease-out group-hover:-translate-x-1 group-focus-visible:-translate-x-1 group-active:-translate-x-1.5 rtl:group-hover:translate-x-1 rtl:group-focus-visible:translate-x-1 rtl:group-active:translate-x-1.5 motion-reduce:transform-none' : '';
  const size = compact ? 'h-9 gap-3 px-3 text-[13px] font-medium' : 'h-10 gap-3 px-[14px] text-sm font-medium';
  const className = `${ROW} ${size} ${tone}`;

  const showTip = () => collapsed && ref.current && setTipRect(ref.current.getBoundingClientRect());
  const hideTip = () => setTipRect(null);

  const content = (
    <>
      {active && <ActiveMark uid={activeId} instant={instant} danger={item.danger} compact={compact} />}
      {(item.loading || Icon) && (
        <span className={`relative z-10 flex ${ICON} shrink-0 items-center justify-center ${nudge} ${item.back || instant ? '' : 'transition-transform duration-200 group-hover/row:scale-110'}`}>
          {item.loading ? <Loader2 className={`${ICON} animate-spin`} /> : <Icon className={`${ICON} ${item.back ? 'rtl:rotate-180' : ''}`} strokeWidth={item.back ? 2 : 1.75} />}
        </span>
      )}
      <Label collapsed={collapsed} instant={instant}>{item.label}</Label>
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

function Group({ group, activeId, collapsed, uid, instant, onNavigate, onExpandSidebar }) {
  const Icon = group.icon;
  const ref = useRef(null);
  const [tipRect, setTipRect] = useState(null);
  // Closed on every load. It opens when the person opens it, or when they land
  // on one of the streams inside it.
  const [open, setOpen] = useState(() => Boolean(group.activeChild && activeId.startsWith('stream:')));
  const hasItems = group.items.length > 0;
  const headerActive = group.activeChild && !activeId.startsWith('stream:');
  const arrived = useRef(false);

  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      return;
    }
    if (group.activeChild && hasItems) setOpen(true);
  }, [group.activeChild, hasItems]);

  const spring = instant ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36 };
  const expanded = open && !collapsed && hasItems;
  const tone = headerActive ? 'font-semibold text-white' : group.activeChild ? 'font-medium text-ink' : 'text-ink/65 hover:bg-black/[0.05] hover:text-ink';

  return (
    <div className="flex flex-col">
      <div className={`${ROW} h-10 text-sm font-medium ${tone}`} onMouseEnter={() => collapsed && ref.current && setTipRect(ref.current.getBoundingClientRect())} onMouseLeave={() => setTipRect(null)}>
        {headerActive && <ActiveMark uid={uid} instant={instant} />}
        <Link
          ref={ref}
          to={group.to}
          aria-label={collapsed ? group.label : undefined}
          aria-current={headerActive ? 'page' : undefined}
          onClick={() => {
            if (collapsed) {
              if (hasItems) setOpen(true);
              onExpandSidebar?.();
            } else if (hasItems) {
              setOpen(group.activeChild ? !open : true);
            }
            onNavigate?.();
          }}
          className="relative z-10 flex h-10 min-w-0 flex-1 items-center gap-3 rounded-lg ps-[14px] pe-1 outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <span className={`flex ${ICON} shrink-0 items-center justify-center ${instant ? '' : 'transition-transform duration-200 group-hover/row:scale-110'}`}>
            <Icon className={ICON} strokeWidth={1.75} />
          </span>
          <Label collapsed={collapsed} instant={instant}>{group.label}</Label>
        </Link>
        {hasItems && (
          <button
            type="button"
            tabIndex={collapsed ? -1 : 0}
            aria-hidden={collapsed || undefined}
            onClick={() => setOpen(!open)}
            aria-expanded={expanded}
            aria-label={group.label}
            className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-inherit outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-accent/40 ${collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          >
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={spring} className="flex">
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </button>
        )}
      </div>
      {collapsed && <Tooltip rect={tipRect}>{group.label}</Tooltip>}

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
            <div className="relative ms-[23px] mt-0.5 pb-1 ps-3">
              <motion.span
                aria-hidden="true"
                initial={instant ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: instant ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ originY: 0 }}
                className="absolute inset-y-0 start-0 w-px rounded-full bg-border"
              />
              <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto overflow-x-hidden pe-0.5">
                {group.items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className="relative"
                    initial={instant ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34, delay: instant ? 0 : Math.min(index, 8) * 0.04 }}
                  >
                    <NavItem item={item} active={item.id === activeId} collapsed={false} activeId={uid} instant={instant} onNavigate={onNavigate} compact />
                  </motion.div>
                ))}
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
      <div className={`flex h-14 shrink-0 items-center border-b border-border ${collapsed ? 'justify-center' : 'justify-between ps-[26px] pe-3'}`}>
        {!collapsed && (showLogo ? <Logo size="sm" linkTo="/dashboard" /> : <h2 className="truncate text-base font-semibold tracking-tight text-ink">{title}</h2>)}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            title={collapsed ? t('nav.expand') : t('nav.collapse')}
            className="group/toggle hidden h-9 w-9 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-black/[0.05] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40 lg:flex"
          >
            <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={instant ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }} className="flex transition-transform duration-200 group-hover/toggle:-translate-x-0.5 rtl:group-hover/toggle:translate-x-0.5">
              <ChevronsLeft className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </motion.span>
          </button>
        )}
      </div>

      <nav aria-label={title || 'Main'} className={`flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden py-3 px-3`}>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={instant ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34, delay: instant ? 0 : Math.min(index, 8) * 0.045 }}
          >
            {item.type === 'group' ? (
              <Group group={item} activeId={activeId} collapsed={collapsed} uid={uid} instant={instant} onNavigate={onNavigate} onExpandSidebar={onToggle} />
            ) : (
              <NavItem item={item} active={item.id === activeId} collapsed={collapsed} activeId={uid} instant={instant} onNavigate={onNavigate} />
            )}
          </motion.div>
        ))}
      </nav>

      {footerItems.length > 0 && (
        <div className={`flex shrink-0 flex-col gap-1 border-t border-border px-3 py-3`}>
          {footerItems.map((item) => (
            <NavItem key={item.id} item={item} active={false} collapsed={collapsed} activeId={uid} instant={instant} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </>
  );
}

function Sidebar({ collapsed, onToggle, ...rest }) {
  const reduced = useAppReducedMotion();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 38 }}
      className="sticky top-0 z-30 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-border bg-gradient-to-b from-white to-[#f9f9fa] lg:flex"
    >
      <div dir={readDirection()} className="flex min-h-0 flex-1 flex-col">
        <SidebarBody {...rest} collapsed={collapsed} onToggle={onToggle} instant={Boolean(reduced)} />
      </div>
    </motion.aside>
  );
}

export default Sidebar;
