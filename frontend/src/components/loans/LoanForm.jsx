import { useState } from 'react';
import Button from '../Button.jsx';
import FormField from '../FormField.jsx';
import Combobox from '../Combobox.jsx';
import FieldError from '../FieldError.jsx';
import ErrorSlot from '../ErrorSlot.jsx';
import WherePicker from './WherePicker.jsx';
import ProofPicker from './ProofPicker.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { toInputDate, dateOptions } from '../../utils/dates.js';
import { keyFor, customFor, splitKey, isOtherKey, methodOf, todayLocal } from './loanOptions.js';

export const emptyLoanForm = (direction, currency) => ({
  direction,
  personName: '',
  amount: '',
  currency: currency || 'PKR',
  sentAt: todayLocal(),
  dueAt: '',
  note: '',
  receivedKey: '',
  receivedCustom: '',
  payoutName: '',
  payoutKey: '',
  payoutCustom: '',
  payoutNumber: '',
});

export const formFromLoan = (loan) => ({
  direction: loan.direction,
  personName: loan.personName,
  amount: String(loan.amount),
  currency: loan.currency,
  sentAt: toInputDate(loan.sentAt),
  dueAt: loan.dueAt ? toInputDate(loan.dueAt) : '',
  note: loan.note || '',
  receivedKey: keyFor(loan.receivedMethod, loan.receivedName),
  receivedCustom: customFor(loan.receivedMethod, loan.receivedName),
  payoutName: loan.payoutName || '',
  payoutKey: keyFor(loan.payoutMethod, loan.payoutInstitution),
  payoutCustom: customFor(loan.payoutMethod, loan.payoutInstitution),
  payoutNumber: loan.payoutNumber === '-' ? '' : loan.payoutNumber || '',
});

function StepLabel({ n, children }) {
  return (
    <span className="flex items-center gap-2 text-sm font-medium text-ink">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-muted">{n}</span>
      {children}
    </span>
  );
}

function LoanForm({ initial, currencies, mode, enteredAt, paid = 0, firstPaymentOn, onCancel, onSubmit, busy }) {
  const { t } = useTranslation();
  const { formatDate, formatMoney } = useFormat();
  const [form, setForm] = useState(initial);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const borrowed = form.direction === 'borrowed';
  const payoutCash = methodOf(form.payoutKey) === 'cash';
  const optionalWord = t('loans.optional');
  const opt = (text) => (
    <span>
      {text} <span className="font-normal text-muted">({optionalWord})</span>
    </span>
  );

  const validate = () => {
    const found = {};
    if (!form.personName.trim()) found.personName = t('loans.errName');
    if (!form.amount || !(Number(form.amount) > 0)) found.amount = t('loans.errAmount');
    else if (Math.round(Number(form.amount) * 100) < Math.round(paid * 100)) found.amount = t('loans.errBelowPaid', { amount: formatMoney(paid, { decimals: 2, currency: form.currency }) });
    if (!form.currency) found.currency = t('income.errCurrency');
    if (!form.sentAt || form.sentAt > todayLocal()) found.sentAt = t('loans.errSent');
    else if (firstPaymentOn && form.sentAt > toInputDate(firstPaymentOn)) found.sentAt = t('loans.errSentPayment');
    if (form.dueAt && form.sentAt && form.dueAt < form.sentAt) found.dueAt = t('loans.errDue');
    if (isOtherKey(form.receivedKey) && !form.receivedCustom.trim()) found.receivedCustom = t('loans.errOther');
    if (form.payoutKey) {
      if (!form.payoutName.trim()) found.payoutName = t('loans.errPayoutName');
      if (isOtherKey(form.payoutKey) && !form.payoutCustom.trim()) found.payoutCustom = t('loans.errOther');
      if (!payoutCash && !form.payoutNumber.trim()) found.payoutNumber = t('loans.errPayoutNumber');
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const submit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    const received = splitKey(form.receivedKey, form.receivedCustom);
    const payout = splitKey(form.payoutKey, form.payoutCustom);
    onSubmit(
      {
        direction: form.direction,
        personName: form.personName,
        amount: Number(form.amount),
        currency: form.currency,
        sentAt: form.sentAt,
        dueAt: form.dueAt,
        note: form.note,
        receivedMethod: received.method,
        receivedName: received.name,
        payoutMethod: payout.method,
        payoutInstitution: payout.name,
        payoutName: payout.method ? form.payoutName : '',
        payoutNumber: payout.method ? (payoutCash ? form.payoutNumber.trim() || '-' : form.payoutNumber) : '',
      },
      file
    );
  };

  const directions = [
    { value: 'borrowed', label: t('loans.directionBorrowed') },
    { value: 'lent', label: t('loans.directionLent') },
  ];

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-2xl border border-border bg-white p-4 sm:p-6">
      <div role="radiogroup" aria-label={t('loans.directionLabel')} className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
        {directions.map((item) => {
          const active = form.direction === item.value;
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => set('direction')(item.value)}
              className={`rounded-lg px-2 py-2.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${active ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <FormField
        label={<StepLabel n={1}>{t('loans.nameLabel')}</StepLabel>}
        value={form.personName}
        maxLength={60}
        onChange={(event) => set('personName')(event.target.value)}
        placeholder={t('loans.namePlaceholder')}
        error={errors.personName}
        autoFocus
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label={<StepLabel n={2}>{t('loans.amountLabel')}</StepLabel>}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={(event) => set('amount')(event.target.value)}
          placeholder="0"
          error={errors.amount}
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm font-medium text-ink sm:ps-7">{t('income.currencyLabel')}</span>
          <Combobox items={currencies} ariaLabel={t('income.currencyLabel')} placeholder={t('income.currencyPlaceholder')} value={form.currency} onChange={set('currency')} />
          <FieldError>{errors.currency}</FieldError>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label={<StepLabel n={3}>{borrowed ? t('loans.sentDateBorrowed') : t('loans.sentDateLent')}</StepLabel>}
            type="date"
            max={todayLocal()}
            value={form.sentAt}
            onChange={(event) => set('sentAt')(event.target.value)}
            error={errors.sentAt}
          />
          <FormField
            label={<StepLabel n={4}>{opt(t('loans.dueLabel'))}</StepLabel>}
            type="date"
            min={form.sentAt || undefined}
            value={form.dueAt}
            onChange={(event) => set('dueAt')(event.target.value)}
            error={errors.dueAt}
          />
        </div>
        <p className="text-xs text-muted">{t('loans.enteredOn', { date: formatDate(new Date(enteredAt || Date.now()), dateOptions) })}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="loan-note" className="text-sm font-medium text-ink">
          <StepLabel n={5}>{opt(borrowed ? t('loans.noteLabelBorrowed') : t('loans.noteLabelLent'))}</StepLabel>
        </label>
        <textarea
          id="loan-note"
          rows={3}
          maxLength={500}
          value={form.note}
          onChange={(event) => set('note')(event.target.value)}
          placeholder={t('loans.notePlaceholder')}
          className="w-full resize-none rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm"
        />
      </div>

      <WherePicker
        optional
        label={<StepLabel n={6}>{opt(borrowed ? t('loans.receivedBorrowedLabel') : t('loans.receivedLentLabel'))}</StepLabel>}
        value={form.receivedKey}
        custom={form.receivedCustom}
        onChange={set('receivedKey')}
        onCustomChange={set('receivedCustom')}
        customError={errors.receivedCustom}
      />

      {mode === 'create' && (
        <ProofPicker label={<StepLabel n={7}>{opt(borrowed ? t('loans.photoReceivedBorrowed') : t('loans.photoReceivedLent'))}</StepLabel>} file={file} onChange={setFile} />
      )}

      <fieldset className="flex flex-col gap-4 rounded-xl border border-border bg-surface/40 p-4">
        <legend className="px-1 text-sm font-semibold text-ink">{opt(borrowed ? t('loans.payoutBorrowed') : t('loans.payoutLent'))}</legend>
        <FormField
          label={t('loans.payoutName')}
          value={form.payoutName}
          maxLength={80}
          onChange={(event) => set('payoutName')(event.target.value)}
          placeholder={t('loans.payoutNamePlaceholder')}
          error={errors.payoutName}
        />
        <WherePicker
          optional
          label={<span className="text-sm font-medium text-ink">{t('loans.accountType')}</span>}
          value={form.payoutKey}
          custom={form.payoutCustom}
          onChange={set('payoutKey')}
          onCustomChange={set('payoutCustom')}
          customError={errors.payoutCustom}
        />
        <FormField
          label={t('loans.payoutNumber')}
          value={form.payoutNumber}
          maxLength={40}
          inputMode="text"
          onChange={(event) => set('payoutNumber')(event.target.value)}
          placeholder={payoutCash ? '-' : t('loans.payoutNumberPlaceholder')}
          error={errors.payoutNumber}
        />
      </fieldset>

      <ErrorSlot />

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">
          {t('common.cancel')}
        </button>
        <div className="sm:w-40">
          <Button type="submit" loading={busy} loadingLabel={t('common.saving')}>
            {t('loans.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default LoanForm;
