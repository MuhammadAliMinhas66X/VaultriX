import { useMemo, useState } from 'react';
import Button from '../Button.jsx';
import FormField from '../FormField.jsx';
import Combobox from '../Combobox.jsx';
import FieldError from '../FieldError.jsx';
import ErrorSlot from '../ErrorSlot.jsx';
import BrandMark from '../BrandMark.jsx';
import WherePicker from '../loans/WherePicker.jsx';
import CategoryPicker from '../expenses/CategoryPicker.jsx';
import { FREQUENCY_KEY } from './BillStatus.jsx';
import { splitKey, isOtherKey, keyFor, customFor } from '../loans/loanOptions.js';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { BILLERS, BILLER_GROUPS, billerById } from '../../utils/billers.js';
import { FREQUENCIES } from '../../utils/billMath.js';
import { shiftDay } from '../../utils/expenseMath.js';
import { dateOptions } from '../../utils/dates.js';

const GROUP_KEY = {
  electricity: 'bills.groupElectricity',
  gas: 'bills.groupGas',
  water: 'bills.groupWater',
  internet: 'bills.groupInternet',
  mobile: 'bills.groupMobile',
  other: 'bills.groupOther',
};

const OTHER = '__other__';
const day = (value) => (value ? String(value).slice(0, 10) : '');

export const emptyBillForm = (currency, last = {}, categories = []) => ({
  billerKey: '',
  billerName: '',
  categoryId: categories.some((category) => category.id === last.categoryId) ? last.categoryId : '',
  amount: '',
  currency: last.currency || currency,
  dueAt: '',
  periodStart: '',
  periodEnd: '',
  frequency: 'none',
  nextBill: '',
  installation: '',
  payKey: last.payKey || '',
  payCustom: last.payCustom || '',
  account: '',
  note: '',
});

export const formFromBill = (bill) => {
  const known = billerById(bill.billerId);
  const isKnown = known && known.name === bill.billerName;
  return {
    billerKey: isKnown ? known.id : OTHER,
    billerName: isKnown ? '' : bill.billerName,
    categoryId: bill.categoryId || '',
    amount: String(bill.amount),
    currency: bill.currency,
    dueAt: day(bill.dueAt),
    periodStart: day(bill.periodStart),
    periodEnd: day(bill.periodEnd),
    frequency: bill.frequency,
    nextBill: day(bill.nextBillAt),
    installation: bill.installation > 0 ? String(bill.installation) : '',
    payKey: keyFor(bill.payMethod, bill.payName),
    payCustom: customFor(bill.payMethod, bill.payName),
    account: bill.billerAccount || '',
    note: bill.note || '',
  };
};

function BillForm({ initial, mode, bill, categories, currencies, onSubmit, onCancel, busy, onAddCategory, onUpdateCategory, onRemoveCategory }) {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  const locked = mode === 'edit' && bill.payments.length > 0;
  const lockRepeat = mode === 'edit' && bill.frequency !== 'none' && !bill.isHead;
  const allowInstallation = mode === 'add' || bill.sequence === 1;

  const billerItems = useMemo(
    () => [
      ...BILLERS.map((biller) => ({ value: biller.id, label: biller.name, icon: <BrandMark method="biller" name={biller.name} size="sm" />, group: t(GROUP_KEY[biller.group]) })),
      { value: OTHER, label: t('bills.billerOther'), icon: <BrandMark method="biller" size="sm" />, group: t(GROUP_KEY.other) },
    ],
    [t]
  );

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const calculated = form.dueAt || form.periodEnd ? shiftDay(form.periodEnd || form.dueAt, 1) : '';
  const recurring = form.frequency !== 'none';

  const submit = (event) => {
    event.preventDefault();
    const found = {};
    const known = billerById(form.billerKey);
    const billerName = known ? known.name : form.billerName.trim();
    if (!billerName) found.biller = t('bills.errBiller');
    if (!form.amount || !(Number(form.amount) > 0)) found.amount = t('loans.errAmount');
    if (!form.currency) found.currency = t('income.errCurrency');
    if (!form.dueAt) found.dueAt = t('bills.errDue');
    if (Boolean(form.periodStart) !== Boolean(form.periodEnd) || (form.periodStart && form.periodStart > form.periodEnd)) found.period = t('bills.errPeriod');
    if (form.installation && !(Number(form.installation) >= 0)) found.installation = t('loans.errAmount');
    if (recurring && form.nextBill && form.nextBill < '2000-01-01') found.nextBill = t('bills.errDate');
    if (isOtherKey(form.payKey) && !form.payCustom.trim()) found.payCustom = t('loans.errOther');
    setErrors(found);
    if (Object.keys(found).length) return;
    const where = splitKey(form.payKey, form.payCustom);
    const payload = {
      billerName,
      billerId: known ? known.id : '',
      categoryId: form.categoryId || null,
      amount: Number(form.amount),
      currency: form.currency,
      dueAt: form.dueAt,
      periodStart: form.periodStart || null,
      periodEnd: form.periodEnd || null,
      billerAccount: form.account.trim(),
      payMethod: where.method,
      payName: where.name,
      note: form.note.trim(),
    };
    if (allowInstallation) payload.installation = form.installation ? Number(form.installation) : 0;
    if (!lockRepeat) {
      payload.frequency = form.frequency;
      if (recurring) payload.nextBillAt = form.nextBill || calculated;
    }
    onSubmit(payload, { payKey: form.payKey, payCustom: form.payCustom });
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-w-0 flex-col gap-6 rounded-2xl border border-border bg-white p-4 sm:p-6">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('bills.billerLabel')}</span>
          <Combobox items={billerItems} ariaLabel={t('bills.billerLabel')} placeholder={t('bills.billerPlaceholder')} searchPlaceholder={t('common.search')} value={form.billerKey} onChange={set('billerKey')} error={form.billerKey ? undefined : errors.biller} />
        </div>
        {form.billerKey === OTHER && (
          <FormField label={t('bills.billerNameLabel')} value={form.billerName} maxLength={60} onChange={(event) => set('billerName')(event.target.value)} placeholder={t('bills.billerNamePlaceholder')} error={errors.biller} />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="bill-amount" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {t('bills.amountLabel')}
        </label>
        <div className="flex items-center gap-3">
          <input
            id="bill-amount"
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
            <Combobox items={currencies} ariaLabel={t('income.currencyLabel')} placeholder={t('income.currencyPlaceholder')} value={form.currency} onChange={locked ? () => null : set('currency')} />
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t('bills.dueDateLabel')} type="date" value={form.dueAt} onChange={(event) => set('dueAt')(event.target.value)} error={errors.dueAt} />
        {allowInstallation && (
          <FormField
            label={<span>{t('bills.installationLabel')} <span className="font-normal text-muted">({t('loans.optional')})</span></span>}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.installation}
            onChange={(event) => set('installation')(event.target.value)}
            placeholder="0"
            error={errors.installation}
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t('bills.periodLabel')} <span className="font-normal text-muted">({t('loans.optional')})</span></span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={<span className="text-xs font-normal text-muted">{t('bills.periodStart')}</span>} type="date" value={form.periodStart} onChange={(event) => set('periodStart')(event.target.value)} />
          <FormField label={<span className="text-xs font-normal text-muted">{t('bills.periodEnd')}</span>} type="date" value={form.periodEnd} onChange={(event) => set('periodEnd')(event.target.value)} />
        </div>
        <FieldError>{errors.period}</FieldError>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <span className="text-sm font-medium text-ink">{t('bills.repeatLabel')}</span>
        {lockRepeat ? (
          <p className="text-sm text-muted">{t(FREQUENCY_KEY[form.frequency])} · {t('bills.repeatLockedNote')}</p>
        ) : (
          <div role="group" aria-label={t('bills.repeatLabel')} className="flex flex-wrap gap-2">
            {FREQUENCIES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={form.frequency === value}
                onClick={() => set('frequency')(value)}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  form.frequency === value ? 'border-ink bg-ink text-white' : 'border-border bg-white text-muted hover:border-ink/30 hover:text-ink'
                }`}
              >
                {t(FREQUENCY_KEY[value])}
              </button>
            ))}
          </div>
        )}
        {recurring && !lockRepeat && (
          <div className="flex flex-col gap-2 rounded-xl bg-surface px-4 py-3.5">
            <FormField label={t('bills.nextBillLabel')} type="date" value={form.nextBill || calculated} onChange={(event) => set('nextBill')(event.target.value)} error={errors.nextBill} />
            {calculated && (
              <p className="text-xs text-muted">
                {t('bills.nextBillHint', { date: formatDate(new Date(`${calculated}T00:00:00Z`), dateOptions) })}
                {form.nextBill && form.nextBill !== calculated && (
                  <button type="button" onClick={() => set('nextBill')('')} className="ms-2 font-semibold text-ink underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
                    {t('bills.useCalculated')}
                  </button>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      <WherePicker
        optional
        label={<span className="text-sm font-medium text-ink">{t('bills.sourceLabel')}</span>}
        value={form.payKey}
        custom={form.payCustom}
        onChange={set('payKey')}
        onCustomChange={set('payCustom')}
        customError={errors.payCustom}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={<span>{t('bills.accountLabel')} <span className="font-normal text-muted">({t('loans.optional')})</span></span>} value={form.account} maxLength={60} onChange={(event) => set('account')(event.target.value)} placeholder={t('bills.accountPlaceholder')} />
        <FormField label={<span>{t('bills.noteLabel')} <span className="font-normal text-muted">({t('loans.optional')})</span></span>} value={form.note} maxLength={200} onChange={(event) => set('note')(event.target.value)} />
      </div>

      <p className="-mt-3 text-xs text-muted">{t('loans.enteredOn', { date: formatDate(new Date(mode === 'edit' ? bill.createdAt : Date.now()), dateOptions) })}</p>

      <ErrorSlot />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">
          {t('common.cancel')}
        </button>
        <div className="sm:w-44">
          <Button type="submit" loading={busy} loadingLabel={t('common.saving')}>
            {t('bills.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default BillForm;
