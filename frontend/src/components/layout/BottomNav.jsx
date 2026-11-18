import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Ellipsis } from 'lucide-react';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { useTranslation } from '../../i18n/useTranslation.js';

const tabsFrom = (items) =>
  items.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    big: item.big,
    to: item.to,
    onSelect: item.onSelect,
    danger: item.danger,
    groupActive: item.type === 'group' ? Boolean(item.activeChild) : false,
  }));

function Tab({ tab, active, uid, reduced }) {
  const Icon = tab.icon;
  const pill = tab.danger ? 'bg-red-600' : 'bg-ink';
  const tone = active ? 'text-white' : tab.danger ? 'text-red-500' : 'text-muted';
  const className = `nav-hover relative flex h-12 min-w-0 items-center justify-center gap-2 rounded-[20px] px-3 outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-accent/40 flex-1 ${tone}`;

  const inner = (
    <>
      {active && (
        <motion.span
          layoutId={`${uid}-pill`}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
          className={`absolute inset-0 rounded-[20px] shadow-[0_8px_18px_-8px_rgba(0,0,0,0.55)] ${pill}`}
        />
      )}
      <Icon className={`relative z-10 shrink-0 ${tab.big ? 'h-[27px] w-[27px]' : 'h-[22px] w-[22px]'}`} strokeWidth={active ? 2 : 1.7} />
    </>
  );

  return tab.to ? (
    <Link to={tab.to} aria-label={tab.label} title={tab.label} aria-current={active ? 'page' : undefined} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={tab.onSelect} aria-label={tab.label} title={tab.label} aria-current={active ? 'page' : undefined} className={className}>
      {inner}
    </button>
  );
}

// The rest of the menu, as a sheet of big tiles, for the pages that do not fit in the bar.
function MoreSheet({ open, onClose, items, activeId, label }) {
  const reduced = useAppReducedMotion();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.15 }} onClick={onClose} className="fixed inset-0 z-[25] bg-ink/30 lg:hidden" />
          <motion.div
            key="sheet"
            role="dialog"
            aria-label={label}
            initial={reduced ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-[26] px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:hidden"
          >
            <div className="mx-auto grid max-w-md grid-cols-3 gap-2 rounded-[26px] border border-border/70 bg-white p-3 shadow-[0_16px_44px_-14px_rgba(0,0,0,0.4)]">
              {items.map((item) => {
                const Icon = item.icon;
                const active = item.id === activeId;
                return (
                  <Link key={item.id} to={item.to} onClick={onClose} aria-current={active ? 'page' : undefined} className={`flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 text-center text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${active ? 'bg-ink text-white' : 'text-ink hover:bg-surface'}`}>
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                    <span className="max-w-full truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function BottomNav({ items, activeId, label }) {
  const uid = useId();
  const reduced = useAppReducedMotion();
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  // Menus with a `bar` flag show those in the bar and the rest under More. Menus without it (Settings,
  // Admin) show everything, as before.
  const split = items.some((item) => item.bar);
  const barItems = split ? items.filter((item) => item.bar) : items;
  const moreItems = split ? items.filter((item) => !item.bar && item.to) : [];
  const moreActive = moreItems.some((item) => item.id === activeId);
  const tabs = tabsFrom(barItems);

  useEffect(() => {
    setMoreOpen(false);
  }, [activeId]);

  return (
    <>
      {moreItems.length > 0 && <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} items={moreItems} activeId={activeId} label={t('nav.more')} />}
      <nav aria-label={label || 'Main'} className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="pointer-events-auto mx-auto flex max-w-md items-stretch gap-1 rounded-[26px] border border-border/70 bg-white/85 p-1.5 shadow-[0_16px_44px_-14px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          {tabs.map((tab) => (
            <Tab key={tab.id} tab={tab} active={!moreOpen && (tab.groupActive || tab.id === activeId)} uid={uid} reduced={Boolean(reduced)} />
          ))}
          {moreItems.length > 0 && <Tab tab={{ id: 'more', label: t('nav.more'), icon: Ellipsis, big: true, onSelect: () => setMoreOpen((value) => !value) }} active={moreOpen || moreActive} uid={uid} reduced={Boolean(reduced)} />}
        </div>
      </nav>
    </>
  );
}

export default BottomNav;
