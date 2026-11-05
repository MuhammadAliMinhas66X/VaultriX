import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation.js';
import { notify } from '../i18n/notifications.js';
import { listExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from '../services/expenseService.js';

const byName = (a, b) => a.name.localeCompare(b.name);

export default function useExpenseCategories() {
  const { t, tServer } = useTranslation();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    listExpenseCategories()
      .then(setCategories)
      .catch((error) => notify.error(tServer(error)));
  }, []);

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
