import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CategoryIcon } from './categoryIcons.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';

const VISIBLE = 5;

function CategoryBreakdown({ rows, activeKey, onPick, money }) {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, VISIBLE);

  return (
    <section className="rounded-3xl border border-border bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('expenses.byCategory')}</h2>
        {activeKey && (
          <button type="button" onClick={() => onPick('')} className="text-xs font-semibold text-ink underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
            {t('expenses.clearFilter')}
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-1">
        {shown.map((row) => {
          const active = activeKey === row.id;
          const dim = activeKey && !active;
          return (
            <li key={row.key}>
              <button
                type="button"
                onClick={() => onPick(active ? '' : row.id)}
                aria-pressed={active}
                className={`flex w-full items-center gap-3.5 rounded-2xl px-2.5 py-2.5 text-start outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${active ? 'bg-surface' : 'hover:bg-surface/70'} ${dim ? 'opacity-45' : ''}`}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${active ? 'bg-ink text-white' : 'bg-surface text-ink'}`}>
                  <CategoryIcon category={row.category} name={row.name} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[15px] font-semibold text-ink">{row.name}</span>
                    <span className="shrink-0 text-[15px] font-bold tabular-nums text-ink">{money(row.value)}</span>
                  </span>
                  <span className="mt-2 flex items-center gap-2.5">
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface ring-1 ring-black/[0.03]">
                      <span className="block h-full rounded-full bg-ink transition-all duration-700" style={{ width: `${Math.max(3, Math.round(row.share * 100))}%` }} />
                    </span>
                    <span className="w-9 shrink-0 text-end text-xs font-semibold tabular-nums text-muted">{Math.round(row.share * 100)}%</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {rows.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setAll((prev) => !prev)}
          className="mx-auto mt-3 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-muted outline-none transition hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          {all ? t('expenses.showLess') : t('expenses.showAll', { count: rows.length })}
          <ChevronDown className={`h-4 w-4 transition ${all ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  );
}

export default CategoryBreakdown;
