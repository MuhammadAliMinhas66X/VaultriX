import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../Button.jsx';
import FormField from '../FormField.jsx';
import Combobox from '../Combobox.jsx';
import FieldError from '../FieldError.jsx';
import ErrorSlot from '../ErrorSlot.jsx';
import WherePicker from '../loans/WherePicker.jsx';
import CategoryPicker from './CategoryPicker.jsx';
import { splitKey, isOtherKey, todayLocal } from '../loans/loanOptions.js';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { initialsFromName } from '../../utils/avatar.js';
import { dateOptions } from '../../utils/dates.js';

function ExpenseForm({ initial, people, enteredAt, loanId, categories, currencies, mode, onSubmit, onDelete, onAddCategory, onUpdateCategory, onRemoveCategory, onCancel, busy }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);

  const payerItems = useMemo(
    () => [
      { value: 'self', label: t('expenses.paidBySelf'), group: t('expenses.paidByGroupYou') },
      ...people.map((name) => ({
        value: `person:${name}`,
        label: name,
        group: t('expenses.paidByGroupPeople'),
        icon: <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-ink">{initialsFromName(name) || '?'}</span>,
      })),
      { value: 'new', label: t('expenses.paidByNew'), group: t('expenses.paidByGroupPeople') },
    ],
    [people, t]
  );

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const other = form.payer !== 'self';
  const shownName = form.payer.startsWith('person:') ? form.payer.slice(7) : form.payerName.trim();

  const submit = (event) => {
    event.preventDefault();
    const found = {};
    if (!form.amount || !(Number(form.amount) > 0)) found.amount = t('loans.errAmount');
    if (!form.currency) found.currency = t('income.errCurrency');
    if (!form.date || form.date > todayLocal()) found.date = t('loans.errSent');
    const other = form.payer !== 'self';
    const payerName = form.payer.startsWith('person:') ? form.payer.slice(7) : form.payerName.trim();
    if (other && !payerName) found.payerName = t('loans.errName');
    if (!other && isOtherKey(form.payKey) && !form.payCustom.trim()) found.payCustom = t('loans.errOther');
    setErrors(found);
    if (Object.keys(found).length) return;
    const where = other ? { method: '', name: '' } : splitKey(form.payKey, form.payCustom);
    onSubmit({
      paidBy: other ? 'other' : 'self',
      payerName: other ? payerName : '',
      amount: Number(form.amount),
      currency: form.currency,
      categoryId: form.categoryId || null,
      spentAt: form.date,
      note: form.note,
      payMethod: where.method,
      payName: where.name,
    });
  };

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

      <CategoryPicker
        categories={categories}
        value={form.categoryId}
        onChange={set('categoryId')}
        onAdd={onAddCategory}
        onUpdate={onUpdateCategory}
        onRemove={(category) => {
          if (form.categoryId === category.id) set('categoryId')('');
          return onRemoveCategory(category);
        }}
      />

      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('expenses.paidByLabel')}</span>
          <Combobox items={payerItems} ariaLabel={t('expenses.paidByLabel')} placeholder={t('expenses.paidBySelf')} searchPlaceholder={t('common.search')} value={form.payer} onChange={set('payer')} />
        </div>
        {form.payer === 'new' && (
          <FormField label={t('loans.nameLabel')} value={form.payerName} maxLength={60} onChange={(event) => set('payerName')(event.target.value)} placeholder={t('loans.namePlaceholder')} error={errors.payerName} />
        )}
        <FieldError>{form.payer !== 'new' ? errors.payerName : ''}</FieldError>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {other ? (
          <motion.div key="preview" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="flex items-start gap-3.5 rounded-2xl bg-ink p-4 text-white">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">{initialsFromName(shownName) || '?'}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{t('expenses.loanPreviewTitle')}</p>
                <p className="mt-1.5 text-sm font-medium leading-relaxed">
                  {t('expenses.loanPreviewBody', { name: shownName || '...', amount: formatMoney(Number(form.amount) || 0, { decimals: 2, currency: form.currency }) })}
                </p>
                {mode === 'edit' && loanId && (
                  <Link to={`/loans?loan=${loanId}`} className="mt-2.5 inline-block text-xs font-semibold text-white underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                    {t('expenses.viewInLoans')}
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="from" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <WherePicker
              optional
              label={<span className="text-sm font-medium text-ink">{t('expenses.paidFrom')}</span>}
              value={form.payKey}
              custom={form.payCustom}
              onChange={set('payKey')}
              onCustomChange={set('payCustom')}
              customError={errors.payCustom}
            />
          </motion.div>
        )}
      </AnimatePresence>

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

      <p className="-mt-3 text-xs text-muted">{t('loans.enteredOn', { date: formatDate(new Date(enteredAt || Date.now()), dateOptions) })}</p>

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
