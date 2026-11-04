import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { CategoryIcon, ICON_KEYS, SUGGESTED, iconKeyFor, iconKeyForName } from './categoryIcons.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';

function CategoryPicker({ categories, value, onChange, onAdd, onUpdate, onRemove }) {
  const { t } = useTranslation();
  const [managing, setManaging] = useState(false);
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    if (editor) setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 260);
  }, [editor === null, editor && editor.id]);

  const missing = useMemo(
    () => SUGGESTED.filter((item) => !categories.some((category) => category.name.toLowerCase() === item.name.toLowerCase())).slice(0, 5),
    [categories]
  );

  const openNew = () => {
    setManaging(false);
    setConfirmDelete(false);
    setEditor({ id: null, name: '', icon: '', iconTouched: false });
  };

  const openEdit = (category) => {
    setConfirmDelete(false);
    setEditor({ id: category.id, name: category.name, icon: iconKeyFor(category), iconTouched: true });
  };

  const close = () => {
    setEditor(null);
    setConfirmDelete(false);
  };

  const effectiveIcon = editor ? (editor.iconTouched ? editor.icon : iconKeyForName(editor.name)) : 'other';

  const save = async () => {
    const name = editor.name.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      if (editor.id) {
        const updated = await onUpdate(editor.id, { name, icon: effectiveIcon });
        if (updated) close();
      } else {
        const created = await onAdd(name, effectiveIcon);
        if (created) {
          onChange(created.id);
          close();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const quickAdd = async (item) => {
    setSaving(true);
    try {
      const created = await onAdd(item.name, item.icon);
      if (created) {
        onChange(created.id);
        close();
      }
    } finally {
      setSaving(false);
    }
  };

  const tile = (active) =>
    `group relative flex flex-col items-center gap-2 rounded-2xl border px-1.5 pb-2.5 pt-3 text-center outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${
      active ? 'border-ink bg-white shadow-[0_8px_22px_-12px_rgba(0,0,0,0.45)]' : 'border-border bg-white hover:border-ink/30'
    }`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">{t('expenses.categoryLabel')}</p>
        {categories.length > 0 && !editor && (
          <button
            type="button"
            onClick={() => setManaging((prev) => !prev)}
            className="text-xs font-semibold text-muted underline-offset-4 outline-none transition hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {managing ? t('expenses.doneEditing') : t('expenses.editCategories')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2.5 min-[400px]:grid-cols-4 sm:grid-cols-5">
        {categories.map((category) => {
          const active = value === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={active}
              onClick={() => (managing ? openEdit(category) : onChange(active ? '' : category.id))}
              className={tile(active)}
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-full transition ${active ? 'bg-ink text-white' : 'bg-surface text-ink group-hover:bg-black/[0.06]'}`}>
                <CategoryIcon category={category} className="h-5 w-5" />
              </span>
              <span className="line-clamp-2 min-h-[2rem] w-full break-normal px-0.5 text-[11.5px] font-medium leading-4 tracking-tight text-ink">{category.name}</span>
              {active && !managing && (
                <span className="absolute end-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
              {managing && (
                <span className="absolute end-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface text-muted ring-1 ring-border">
                  <Pencil className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
        {!managing && (
          <button type="button" onClick={openNew} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-1.5 pb-2.5 pt-3 text-muted outline-none transition hover:border-ink/40 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface">
              <Plus className="h-5 w-5" />
            </span>
            <span className="min-h-[2rem] text-[12px] font-medium leading-4">{t('expenses.newCategory')}</span>
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {editor && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div ref={editorRef} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/60 p-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                  <CategoryIcon iconKey={effectiveIcon} className="h-5 w-5" />
                </span>
                <input
                  autoFocus
                  value={editor.name}
                  maxLength={40}
                  onChange={(event) => setEditor((prev) => ({ ...prev, name: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      save();
                    }
                  }}
                  placeholder={t('expenses.categoryPlaceholder')}
                  aria-label={t('expenses.categoryName')}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3.5 py-3 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm"
                />
              </div>

              {!editor.id && missing.length > 0 && !editor.name && (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('expenses.quickAdd')}</p>
                  <div className="flex flex-wrap gap-2">
                    {missing.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        disabled={saving}
                        onClick={() => quickAdd(item)}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none transition hover:border-ink/40 focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
                      >
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
                  {ICON_KEYS.map((key) => {
                    const selected = effectiveIcon === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-label={key}
                        aria-pressed={selected}
                        onClick={() => setEditor((prev) => ({ ...prev, icon: key, iconTouched: true }))}
                        className={`flex aspect-square items-center justify-center rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${selected ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-border hover:text-ink'}`}
                      >
                        <CategoryIcon iconKey={key} className="h-[18px] w-[18px]" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {editor.id &&
                  (confirmDelete ? (
                    <div className="flex w-full flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5">
                      <span className="me-auto text-sm font-medium text-red-700">{t('expenses.deleteCategoryAsk', { name: editor.name })}</span>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-ink">
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const target = categories.find((category) => category.id === editor.id);
                          close();
                          if (target) await onRemove(target);
                        }}
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white"
                      >
                        {t('expenses.deleteCategory')}
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(true)} aria-label={t('expenses.deleteCategory')} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-white text-muted outline-none transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-accent/40">
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                  ))}
                {!confirmDelete && (
                  <>
                    <button type="button" onClick={close} className="ms-auto rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-muted transition hover:text-ink">
                      {t('common.cancel')}
                    </button>
                    <button type="button" onClick={save} disabled={!editor.name.trim() || saving} className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40">
                      {editor.id ? t('expenses.saveCategory') : t('expenses.addCategory')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CategoryPicker;
