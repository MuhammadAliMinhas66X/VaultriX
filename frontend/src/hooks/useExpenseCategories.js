import { useCallback, useMemo } from 'react';
import { useTranslation } from '../i18n/useTranslation.js';
import { notify } from '../i18n/notifications.js';
import { createExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from '../services/expenseService.js';
import { useResource } from '../data/useResource.js';

const byName = (a, b) => a.name.localeCompare(b.name);
const NO_CATEGORIES = [];

export default function useExpenseCategories() {
  const { t, tServer } = useTranslation();
  const { data, update } = useResource('categories', null, { onError: (error) => notify.error(tServer(error)) });
  const categories = data ?? NO_CATEGORIES;
  const setCategories = useCallback((fn) => update((prev) => fn(prev ?? NO_CATEGORIES)), [update]);

  const failed = useCallback((error) => notify.error(tServer(error), { title: t('expenses.categoryFailedTitle') }), [t, tServer]);

  const addCategory = useCallback(
    async (name, icon = '') => {
      try {
        const { category } = await createExpenseCategory(name, icon);
        setCategories((prev) => [...prev, category].sort(byName));
        return category;
      } catch (error) {
        failed(error);
        return null;
      }
    },
    [failed]
  );

  const updateCategory = useCallback(
    async (id, patch) => {
      try {
        const { category } = await updateExpenseCategory(id, patch);
        setCategories((prev) => prev.map((item) => (item.id === id ? category : item)).sort(byName));
        return category;
      } catch (error) {
        failed(error);
        return null;
      }
    },
    [failed]
  );

  const removeCategory = useCallback(
    async (category) => {
      try {
        await deleteExpenseCategory(category.id);
        setCategories((prev) => prev.filter((item) => item.id !== category.id));
      } catch (error) {
        failed(error);
      }
    },
    [failed]
  );

  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const nameOf = useCallback((id) => (id && byId.get(id)?.name) || t('expenses.uncategorized'), [byId, t]);

  return { categories, byId, nameOf, addCategory, updateCategory, removeCategory };
}
