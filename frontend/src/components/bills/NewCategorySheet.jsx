import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { CategoryIcon, ICON_KEYS, SUGGESTED, iconKeyForName } from '../expenses/categoryIcons.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';

function NewCategorySheet({ initialName = '', categories, onCreate, onClose }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const shownIcon = icon || iconKeyForName(name);
  const missing = useMemo(
    () => SUGGESTED.filter((item) => !categories.some((category) => category.name.toLowerCase() === item.name.toLowerCase())).slice(0, 6),
    [categories]
  );

  useEffect(() => {
    const fine = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
    if (fine) inputRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const create = async (label, iconKey) => {
    const clean = label.trim();
    if (!clean || saving) return;
    setSaving(true);
    try {
      const created = await onCreate(clean, iconKey);
      if (created) onClose(created);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t('bills.newCategoryTitle')}>
      <button type="button" aria-label={t('common.cancel')} onClick={() => onClose()} className="absolute inset-0 cursor-default bg-black/40" tabIndex={-1} />
      <div className="relative flex max-h-[92dvh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{t('bills.newCategoryTitle')}</h2>
          <button type="button" onClick={() => onClose()} aria-label={t('common.cancel')} className="flex h-9 w-9 items-center justify-center rounded-full text-muted outline-none transition hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-white">
            <CategoryIcon iconKey={shownIcon} className="h-5 w-5" />
          </span>
          <input
            ref={inputRef}
            value={name}
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                create(name, shownIcon);
              }
            }}
            placeholder={t('expenses.categoryPlaceholder')}
            aria-label={t('expenses.categoryName')}
            className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3.5 py-3 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm"
          />
        </div>

        {!name && missing.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('expenses.quickAdd')}</p>
            <div className="flex flex-wrap gap-2">
              {missing.map((item) => (
                <button key={item.name} type="button" disabled={saving} onClick={() => create(item.name, item.icon)} className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none transition hover:border-ink/40 focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50">
                  <CategoryIcon iconKey={item.icon} className="h-4 w-4" />
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('expenses.chooseIcon')}</p>
          <div className="grid grid-cols-8 gap-1.5">
            {ICON_KEYS.map((key) => (
              <button key={key} type="button" aria-label={key} aria-pressed={shownIcon === key} onClick={() => setIcon(key)} className={`flex aspect-square items-center justify-center rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${shownIcon === key ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-border hover:text-ink'}`}>
                <CategoryIcon iconKey={key} className="h-[18px] w-[18px]" />
              </button>
            ))}
          </div>
        </div>

        <button type="button" onClick={() => create(name, shownIcon)} disabled={!name.trim() || saving} className="rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40">
          {t('bills.createCategory')}
        </button>
      </div>
    </div>,
    document.body
  );
}

export default NewCategorySheet;
