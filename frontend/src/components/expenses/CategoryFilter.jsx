import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ListFilter } from 'lucide-react';
import { CategoryIcon } from './categoryIcons.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';

// A filter icon in the corner of the list. Opens a small menu of the categories
// that have spending this month; picking one filters the list, picking it again
// (or "All categories") clears it.
function CategoryFilter({ rows, value, onChange, money }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id) => {
    onChange(id === value ? '' : id);
    setOpen(false);
  };

  const row = 'flex w-full items-center gap-3 px-3.5 py-2.5 text-start text-sm outline-none transition hover:bg-surface focus-visible:bg-surface';

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('expenses.filterCategories')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative flex h-[42px] w-[42px] items-center justify-center rounded-lg border outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${
          value || open ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink hover:border-ink/30'
        }`}
      >
        <ListFilter className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {value && <span className="absolute -end-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute end-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-2xl border border-border bg-white shadow-[0_18px_40px_-16px_rgba(17,17,20,0.35)]"
          >
            <p className="border-b border-border px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('expenses.filterCategories')}</p>
            <div className="max-h-60 overflow-y-scroll py-1 [scrollbar-color:#c4c4c9_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#c4c4c9] [&::-webkit-scrollbar-track]:bg-transparent">
              <button type="button" role="menuitemradio" aria-checked={!value} onClick={() => pick('')} className={row}>
                <span className="flex-1 font-medium text-ink">{t('expenses.allCategories')}</span>
                {!value && <Check className="h-4 w-4 text-ink" strokeWidth={2.25} />}
              </button>
              {rows.map((item) => (
                <button key={item.key} type="button" role="menuitemradio" aria-checked={value === item.id} onClick={() => pick(item.id)} className={row}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-ink">
                    <CategoryIcon category={item.category} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{item.name}</span>
                    <span className="block text-xs tabular-nums text-muted">{money(item.value ?? item.total ?? 0)}</span>
                  </span>
                  {value === item.id && <Check className="h-4 w-4 shrink-0 text-ink" strokeWidth={2.25} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CategoryFilter;
