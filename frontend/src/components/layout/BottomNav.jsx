import { useId } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';

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

function BottomNav({ items, activeId, label }) {
  const uid = useId();
  const reduced = useAppReducedMotion();
  const tabs = tabsFrom(items);

  return (
    <nav aria-label={label || 'Main'} className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-md items-stretch gap-1 rounded-[26px] border border-border/70 bg-white/85 p-1.5 shadow-[0_16px_44px_-14px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        {tabs.map((tab) => (
          <Tab key={tab.id} tab={tab} active={tab.groupActive || tab.id === activeId} uid={uid} reduced={Boolean(reduced)} />
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
