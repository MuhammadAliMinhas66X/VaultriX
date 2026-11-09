import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Combobox from '../Combobox.jsx';
import { CategoryIcon, ICON_KEYS, iconKeyFor, iconKeyForName, iconLabel } from './categoryIcons.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';

const bubble = (node) => <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-ink">{node}</span>;

function CategoryPicker({ categories, value, onChange, onAdd, onUpdate, onRemove }) {
  const { t } = useTranslation();
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    if (editor) setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 260);
  }, [editor === null, editor && editor.id]);

  const items = useMemo(
    () => [
      { value: '', label: t('expenses.uncategorized'), icon: bubble(<CategoryIcon iconKey="other" className="h-4 w-4" />) },
      ...categories.map((category) => ({ value: category.id, label: category.name, icon: bubble(<CategoryIcon category={category} className="h-4 w-4" />) })),
    ],
    [categories, t]
  );

  const iconItems = useMemo(
    () => ICON_KEYS.map((key) => ({ value: key, label: iconLabel(key), icon: bubble(<CategoryIcon iconKey={key} className="h-4 w-4" />) })),
    []
  );

  const selected = categories.find((category) => category.id === value) || null;
  const effectiveIcon = editor ? (editor.iconTouched ? editor.icon : iconKeyForName(editor.name)) : 'other';

  const openNew = () => {
    setConfirmDelete(false);
    setEditor({ id: null, name: '', icon: '', iconTouched: false });
  };

  const openEdit = () => {
    if (!selected) return;
    setConfirmDelete(false);
    setEditor({ id: selected.id, name: selected.name, icon: iconKeyFor(selected), iconTouched: true });
  };

  const close = () => {
    setEditor(null);
    setConfirmDelete(false);
  };

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

  const iconButton =
    'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-muted outline-none transition hover:border-ink/30 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11';

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-ink">{t('expenses.categoryLabel')}</p>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Combobox items={items} ariaLabel={t('expenses.categoryLabel')} placeholder={t('expenses.categoryChoose')} searchPlaceholder={t('common.search')} value={value} onChange={onChange} />
        </div>
        <button type="button" onClick={openEdit} disabled={!selected} aria-label={t('expenses.editCategory')} title={t('expenses.editCategory')} className={iconButton}>
          <Pencil className="h-[18px] w-[18px]" />
        </button>
        <button type="button" onClick={openNew} aria-label={t('expenses.newCategory')} title={t('expenses.newCategory')} className={iconButton}>
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {editor && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div ref={editorRef} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/60 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{editor.id ? t('expenses.editCategory') : t('expenses.newCategory')}</p>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink">{t('expenses.categoryName')}</label>
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
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-3 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">{t('expenses.chooseIcon')}</span>
                <Combobox
                  items={iconItems}
                  ariaLabel={t('expenses.chooseIcon')}
                  placeholder={t('expenses.chooseIcon')}
                  searchPlaceholder={t('common.search')}
                  value={effectiveIcon}
                  onChange={(key) => setEditor((prev) => ({ ...prev, icon: key, iconTouched: true }))}
                />
              </div>

              {editor.id && confirmDelete ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5">
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
                <div className="flex flex-wrap items-center gap-2">
                  {editor.id && (
                    <button type="button" onClick={() => setConfirmDelete(true)} aria-label={t('expenses.deleteCategory')} className={`${iconButton} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}>
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                  )}
                  <button type="button" onClick={close} className="ms-auto rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-muted transition hover:text-ink">
                    {t('common.cancel')}
                  </button>
                  <button type="button" onClick={save} disabled={!editor.name.trim() || saving} className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40">
                    {editor.id ? t('expenses.saveCategory') : t('expenses.addCategory')}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CategoryPicker;
