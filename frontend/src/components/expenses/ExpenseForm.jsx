import { useState } from 'react';
import Button from '../Button.jsx';
import FormField from '../FormField.jsx';
import Combobox from '../Combobox.jsx';
import FieldError from '../FieldError.jsx';
import ErrorSlot from '../ErrorSlot.jsx';
import WherePicker from '../loans/WherePicker.jsx';
import { splitKey, isOtherKey, todayLocal } from '../loans/loanOptions.js';
import { useTranslation } from '../../i18n/useTranslation.js';

function ExpenseForm({ initial, categories, currencies, mode, onSubmit, onDelete, onAddCategory, onRemoveCategory, onCancel, busy }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirming, setConfirming] = useState(false);

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const submit = (event) => {
    event.preventDefault();
    const found = {};
    if (!form.amount || !(Number(form.amount) > 0)) found.amount = t('loans.errAmount');
    if (!form.currency) found.currency = t('income.errCurrency');
    if (!form.date || form.date > todayLocal()) found.date = t('loans.errSent');
    if (isOtherKey(form.payKey) && !form.payCustom.trim()) found.payCustom = t('loans.errOther');
    setErrors(found);
    if (Object.keys(found).length) return;
    const where = splitKey(form.payKey, form.payCustom);
    onSubmit({
      amount: Number(form.amount),
      currency: form.currency,
      categoryId: form.categoryId || null,
      spentAt: form.date,
      note: form.note,
      payMethod: where.method,
      payName: where.name,
    });
  };

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    const created = await onAddCategory(name);
    if (created) {
      set('categoryId')(created.id);
      setNewName('');
      setAdding(false);
    }
  };

  const chip = (active) =>
    `flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${
      active ? 'border-ink bg-ink text-white' : 'border-border bg-white text-muted hover:border-ink/30 hover:text-ink'
    }`;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 rounded-2xl border border-border bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="expense-amount" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {t('loans.amountLabel')}
        </label>
        <div className="flex items-center gap-3">
          <input
            id="expense-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            autoFocus={mode === 'add'}
            value={form.amount}
            onChange={(event) => set('amount')(event.target.value)}
            placeholder="0"
            className="min-w-0 flex-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none border-b-2 border-border bg-transparent pb-2 text-[2.25rem] font-bold leading-none tracking-tight tabular-nums text-ink outline-none transition placeholder:text-border focus:border-ink"
          />
          <div className="w-36 shrink-0">
            <Combobox items={currencies} ariaLabel={t('income.currencyLabel')} placeholder={t('income.currencyPlaceholder')} value={form.currency} onChange={set('currency')} />
          </div>
        </div>
        <FieldError>{errors.amount || errors.currency}</FieldError>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink">{t('expenses.categoryLabel')}</p>
          {categories.length > 0 && (
            <button type="button" onClick={() => setManaging((prev) => !prev)} className="text-xs font-medium text-muted underline-offset-4 outline-none transition hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-accent/40">
              {managing ? t('expenses.doneEditing') : t('expenses.editCategories')}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <span key={category.id} className="flex">
              <button
                type="button"
                onClick={() => (managing ? undefined : set('categoryId')(form.categoryId === category.id ? '' : category.id))}
                aria-pressed={form.categoryId === category.id}
                className={chip(form.categoryId === category.id)}
              >
                {category.name}
                {managing && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={t('expenses.removeCategory', { name: category.name })}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveCategory(category);
                      if (form.categoryId === category.id) set('categoryId')('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onRemoveCategory(category);
                        if (form.categoryId === category.id) set('categoryId')('');
                      }
                    }}
                    className="-me-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-xs leading-none"
                  >
                    x
                  </span>
                )}
              </button>
            </span>
          ))}
          {!adding && (
            <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 py-2 text-sm font-medium text-muted outline-none transition hover:border-ink/40 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40">
              + {t('expenses.newCategory')}
            </button>
          )}
        </div>
        {adding && (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              maxLength={40}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addCategory();
                }
              }}
              placeholder={t('expenses.categoryPlaceholder')}
              className="min-w-0 flex-1 rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm"
            />
            <button type="button" onClick={addCategory} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
              {t('expenses.addCategory')}
            </button>
            <button type="button" onClick={() => { setAdding(false); setNewName(''); }} className="rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>

      <WherePicker
        optional
        label={<span className="text-sm font-medium text-ink">{t('expenses.paidFrom')}</span>}
        value={form.payKey}
        custom={form.payCustom}
        onChange={set('payKey')}
        onCustomChange={set('payCustom')}
        customError={errors.payCustom}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t('expenses.dateLabel')} type="date" max={todayLocal()} value={form.date} onChange={(event) => set('date')(event.target.value)} error={errors.date} />
        <FormField
          label={<span>{t('expenses.noteLabel')} <span className="font-normal text-muted">({t('loans.optional')})</span></span>}
          value={form.note}
          maxLength={200}
          onChange={(event) => set('note')(event.target.value)}
          placeholder={t('expenses.notePlaceholder')}
        />
      </div>

      <ErrorSlot />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {mode === 'edit' ? (
          confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-red-700">{t('expenses.deleteAsk')}</span>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">
                {t('common.cancel')}
              </button>
              <button type="button" onClick={onDelete} className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-red-700">
                {t('loans.delete')}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="rounded-lg px-3.5 py-2.5 text-sm font-medium text-red-600 outline-none transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-accent/40">
              {t('loans.delete')}
            </button>
          )
        ) : (
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">
            {t('common.cancel')}
          </button>
        )}
        <div className="sm:w-44">
          <Button type="submit" loading={busy} loadingLabel={t('common.saving')}>
            {t('expenses.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default ExpenseForm;
