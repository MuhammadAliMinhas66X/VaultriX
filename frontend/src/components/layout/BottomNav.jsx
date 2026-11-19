import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation.js';
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

function Tab({ tab, active, uid, reduced, dense }) {
  const Icon = tab.icon;
  const pill = tab.danger ? 'bg-red-600' : 'bg-ink';
  const tone = active ? 'text-white' : tab.danger ? 'text-red-500' : 'text-muted';
  const className = `nav-hover relative flex h-12 min-w-0 items-center justify-center gap-2 rounded-[20px] ${dense ? 'px-1' : 'px-3'} outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-accent/40 flex-1 ${tone}`;

  const inner = (
    <>
      {active && (
        <motion.span
          layoutId={`${uid}-pill`}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
          className={`absolute inset-0 rounded-[20px] shadow-[0_8px_18px_-8px_rgba(0,0,0,0.55)] ${pill}`}
        />
      )}
      <Icon className={`relative z-10 shrink-0 ${tab.big && !dense ? 'h-[27px] w-[27px]' : 'h-[22px] w-[22px]'}`} strokeWidth={active ? 2 : 1.7} />
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

const MAX_TABS = 5;

function MoreSheet({ tabs, activeId, onClose }) {
  const { t } = useTranslation();
  return createPortal(
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={t('nav.more')}>
      <button type="button" aria-label={t('common.close')} onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-x-3 bottom-3 rounded-3xl border border-border bg-white p-4 pb-5 shadow-2xl" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        <p className="mb-3 px-1 text-sm font-semibold text-ink">{t('nav.more')}</p>
        <div className="grid grid-cols-4 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeId;
            return (
              <Link key={tab.id} to={tab.to} onClick={onClose} aria-current={active ? 'page' : undefined} className={`nav-hover flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center outline-none ${active ? 'bg-ink text-white' : 'bg-surface text-ink'}`}>
                <Icon className="h-6 w-6" strokeWidth={1.8} />
                <span className="w-full truncate text-[11px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

function BottomNav({ items, activeId, label }) {
  const uid = useId();
  const reduced = useAppReducedMotion();
  const { t } = useTranslation();
  const [more, setMore] = useState(false);
  const all = tabsFrom(items);
  const crowded = all.length > MAX_TABS && all.every((tab) => tab.to);
  const shown = crowded ? all.slice(0, MAX_TABS - 1) : all;
  const hidden = crowded ? all.slice(MAX_TABS - 1) : [];
  const moreActive = hidden.some((tab) => tab.id === activeId || tab.groupActive);

  return (
    <nav aria-label={label || 'Main'} className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-md items-stretch gap-1 rounded-[26px] border border-border/70 bg-white/85 p-1.5 shadow-[0_16px_44px_-14px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        {shown.map((tab) => (
          <Tab key={tab.id} dense={shown.length > 7} tab={tab} active={tab.groupActive || tab.id === activeId} uid={uid} reduced={Boolean(reduced)} />
        ))}
        {crowded && (
          <Tab key="more" dense={false} tab={{ id: 'more', label: t('nav.more'), icon: MoreHorizontal, onSelect: () => setMore(true) }} active={moreActive} uid={uid} reduced={Boolean(reduced)} />
        )}
      </div>
      {more && <MoreSheet tabs={hidden} activeId={activeId} onClose={() => setMore(false)} />}
    </nav>
  );
}

export default BottomNav;
