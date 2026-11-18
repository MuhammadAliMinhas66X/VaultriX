import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import Combobox from '../Combobox.jsx';
import MoneyInput from '../MoneyInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useIncome } from '../../context/IncomeContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { notify } from '../../i18n/notifications.js';
import { useResource } from '../../data/useResource.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { budgetRows, budgetTotals } from '../../utils/reportMath.js';
import { saveBudget, removeBudget } from '../../services/planningService.js';

const NONE = [];
const card = 'rounded-2xl border border-border bg-white p-4 sm:p-5';
const field = 'w-full rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';

export default function Budgets({ categories, expenses, canWrite }) {
  const { t, tServer } = useTranslation();
  const { formatMoney } = useFormat();
  const { currency } = useAuth();
  const { rates } = useIncome();
  const calm = useAppReducedMotion();
  const resource = useResource('budgets');
  const budgets = resource.data ? resource.data.budgets : NONE;
  const [editing, setEditing] = useState(null);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState('');

  const names = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);
  const rows = useMemo(() => (rates ? budgetRows(budgets, expenses, rates, currency) : NONE), [budgets, expenses, rates, currency]);
  const total = budgetTotals(rows);
  const free = categories.filter((item) => !budgets.some((budget) => budget.categoryId === item.id) || item.id === editing);
  const items = free.map((item) => ({ value: item.id, label: item.name }));

  const open = (row) => {
    setEditing(row ? row.categoryId : '');
    setCategory(row ? row.categoryId : '');
    setAmount(row ? String(Math.round(row.limit * 100) / 100) : '');
  };
  const close = () => {
    setEditing(null);
    setCategory('');
    setAmount('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!category || !(Number(amount) > 0)) return;
    setBusy(true);
    try {
      await saveBudget({ categoryId: category, amount: Number(amount), currency });
      notify.success(t('reports.budgetSaved'));
      close();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (asking !== id) {
      setAsking(id);
      return;
    }
    setAsking('');
    try {
      await removeBudget(id);
    } catch (error) {
      notify.error(tServer(error));
    }
  };

  const overall = Math.min(1, total.ratio);
  return (
    <div className="flex flex-col gap-5">
      {rows.length > 0 && (
        <section className={card}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-muted">{t('reports.budgetTotal')}</p>
            <p className="whitespace-nowrap text-sm tabular-nums text-muted"><span className="text-lg font-semibold text-ink">{formatMoney(total.spent, { currency })}</span> / {formatMoney(total.limit, { currency })}</p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface">
            <motion.div initial={calm ? false : { width: 0 }} animate={{ width: `${overall * 100}%` }} transition={{ duration: 0.7 }} className={`h-full rounded-full ${total.ratio > 1 ? 'bg-red-600' : 'bg-ink'}`} />
          </div>
        </section>
      )}

      {canWrite && editing === null && (
        <button type="button" onClick={() => open(null)} disabled={free.length === 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto sm:self-start">
          <Plus className="h-4 w-4" />{t('reports.addBudget')}
        </button>
      )}

      {editing !== null && (
        <form onSubmit={submit} className={`${card} flex flex-col gap-4`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">{editing ? t('reports.editBudget') : t('reports.addBudget')}</h2>
            <button type="button" aria-label={t('common.close')} onClick={close} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">{t('reports.category')}</span>
            <Combobox items={items} searchable={items.length > 7} ariaLabel={t('reports.category')} value={category} onChange={setCategory} placeholder={t('reports.pickCategory')} />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">{t('reports.monthlyLimit')}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted">{currency}</span>
              <MoneyInput value={amount} onChange={setAmount} aria-label={t('reports.monthlyLimit')} className={field} />
            </div>
          </label>
          <button type="submit" disabled={busy || !category || !(Number(amount) > 0)} className="rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">{t('reports.save')}</button>
        </form>
      )}

      {rows.length === 0 && editing === null ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
          <p className="max-w-sm text-base font-medium text-ink">{t('reports.noBudgets')}</p>
          <p className="mt-1.5 max-w-sm text-sm text-muted">{t('reports.noBudgetsHint')}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((row, index) => (
            <li key={row.id} className={card}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{names.get(row.categoryId) || t('reports.uncategorised')}</p>
                  <p className={`mt-0.5 whitespace-nowrap text-xs font-medium ${row.status === 'over' ? 'text-red-600' : row.status === 'warn' ? 'text-amber-700' : 'text-muted'}`}>
                    {row.status === 'over' ? t('reports.over', { amount: formatMoney(-row.left, { currency }) }) : row.status === 'warn' ? t('reports.almost', { amount: formatMoney(row.left, { currency }) }) : t('reports.leftOf', { amount: formatMoney(row.left, { currency }) })}
                  </p>
                </div>
                {canWrite && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" aria-label={t('reports.edit')} onClick={() => open(row)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"><Pencil className="h-4 w-4" /></button>
                    <button type="button" aria-label={t('reports.remove')} onClick={() => remove(row.id)} onBlur={() => setAsking('')} className={`flex h-8 items-center justify-center rounded-lg text-xs font-medium transition ${asking === row.id ? 'bg-red-600 px-2.5 text-white' : 'w-8 text-muted hover:bg-surface hover:text-ink'}`}>
                      {asking === row.id ? t('reports.sure') : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                <motion.div initial={calm ? false : { width: 0 }} animate={{ width: `${Math.min(1, row.ratio) * 100}%` }} transition={{ duration: 0.6, delay: calm ? 0 : index * 0.05 }} className={`h-full rounded-full ${row.status === 'over' ? 'bg-red-600' : row.status === 'warn' ? 'bg-amber-500' : 'bg-ink'}`} />
              </div>
              <p className="mt-2 whitespace-nowrap text-xs tabular-nums text-muted">{formatMoney(row.spent, { currency })} / {formatMoney(row.limit, { currency })}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
