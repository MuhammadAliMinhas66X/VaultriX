import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useId } from 'react';

const tabsFrom = (items) =>
  items.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    to: item.to,
    onSelect: item.onSelect,
    danger: item.danger,
    active: item.type === 'group' ? Boolean(item.activeChild) : false,
  }));

function Tab({ tab, active, uid, reduced }) {
  const Icon = tab.icon;
  const tone = tab.danger ? (active ? 'text-red-600' : 'text-red-500/80') : active ? 'text-ink' : 'text-muted';
  const inner = (
    <>
      {active && (
        <motion.span
          layoutId={`${uid}-tab`}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }}
          className={`absolute inset-x-3 top-0 h-0.5 rounded-full ${tab.danger ? 'bg-red-600' : 'bg-ink'}`}
        />
      )}
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.6} />
      <span className="max-w-full truncate px-1 text-[10.5px] font-medium leading-tight">{tab.label}</span>
    </>
  );
  const className = `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 outline-none transition-colors focus-visible:bg-black/[0.04] ${tone}`;

  return tab.to ? (
    <Link to={tab.to} aria-current={active ? 'page' : undefined} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={tab.onSelect} aria-current={active ? 'page' : undefined} className={className}>
      {inner}
    </button>
  );
}

function BottomNav({ items, activeId, label }) {
  const uid = useId();
  const reduced = useReducedMotion();
  const tabs = tabsFrom(items);

  return (
    <nav
      aria-label={label || 'Main'}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex h-16 max-w-xl items-stretch">
        {tabs.map((tab) => (
          <Tab key={tab.id} tab={tab} active={tab.active || tab.id === activeId} uid={uid} reduced={Boolean(reduced)} />
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
