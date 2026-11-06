import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X, Check } from 'lucide-react';
import { CategoryIcon } from '../expenses/categoryIcons.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';

const Chip = ({ active, onClick, children, count }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${active ? 'border-ink bg-ink text-white' : 'border-border bg-white text-muted hover:border-ink/30 hover:text-ink'}`}
  >
    {children}
    {count !== undefined && <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-surface text-muted'}`}>{count}</span>}
  </button>
);

// One small button for every filter. The count badge says how many are on.
function BillFilter({ views, viewLabel, counts, view, onView, categories, category, onCategory, resultCount }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const active = (view !== 'all' ? 1 : 0) + (category ? 1 : 0);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('bills.filters')}
        aria-haspopup="dialog"
        className="relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-border bg-white text-ink outline-none transition hover:border-ink/30 focus-visible:ring-2 focus-visible:ring-accent/40 active:scale-95 sm:h-[44px] sm:w-[44px]"
      >
        <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {active > 0 && <span className="absolute -end-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white ring-2 ring-white">{active}</span>}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t('bills.filters')}>
            <button type="button" aria-label={t('common.cancel')} onClick={close} tabIndex={-1} className="absolute inset-0 cursor-default bg-black/40" />
            <div className="relative flex max-h-[88dvh] w-full max-w-md flex-col gap-6 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-ink">{t('bills.filters')}</h2>
                <button type="button" onClick={close} aria-label={t('common.cancel')} className="flex h-9 w-9 items-center justify-center rounded-full text-muted outline-none transition hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('bills.filterStatus')}</p>
                <div className="flex flex-wrap gap-2">
                  {views.map((name) => (
                    <Chip key={name} active={view === name} onClick={() => onView(name)} count={counts[name]}>
                      {viewLabel(name)}
                    </Chip>
                  ))}
                </div>
              </div>

              {categories.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('bills.categoryLabel')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Chip active={!category} onClick={() => onCategory('')}>{t('bills.allCategories')}</Chip>
                    {categories.map((item) => (
                      <Chip key={item.id} active={category === item.id} onClick={() => onCategory(category === item.id ? '' : item.id)}>
                        <CategoryIcon category={item} className="h-3.5 w-3.5" />
                        {item.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={active === 0}
                  onClick={() => {
                    onView('all');
                    onCategory('');
                  }}
                  className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted outline-none transition hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40"
                >
                  {t('bills.filterReset')}
                </button>
                <button type="button" onClick={close} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/40">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  {t('bills.filterShow', { count: resultCount })}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default BillFilter;
