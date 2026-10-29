import { useState } from 'react';
import Button from '../Button.jsx';
import FormField from '../FormField.jsx';
import ProofPicker from './ProofPicker.jsx';
import ErrorSlot from '../ErrorSlot.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { toInputDate } from '../../utils/dates.js';
import { todayLocal } from './loanOptions.js';

function PaymentForm({ loan, onSubmit, onCancel, busy }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(todayLocal());
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});

  const sentOn = toInputDate(loan.sentAt);
  const remainingText = formatMoney(loan.remaining, { decimals: 2, currency: loan.currency });

  const clear = (key) => setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));

  const submit = (event) => {
    event.preventDefault();
    const found = {};
    const value = Number(amount);
    if (!amount || !(value > 0)) found.amount = t('loans.errAmount');
    else if (Math.round(value * 100) > Math.round(loan.remaining * 100)) found.amount = t('loans.errOverpay', { amount: remainingText });
    if (!paidAt || paidAt > todayLocal() || paidAt < sentOn) found.paidAt = t('loans.errPaymentDate');
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit({ amount: value, paidAt, note }, file);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-xl border border-border bg-surface/50 p-4">
      <div className="flex flex-col gap-1.5">
        <FormField
          label={t('loans.paymentAmount')}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            clear('amount');
          }}
          placeholder="0"
          error={errors.amount}
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setAmount(String(loan.remaining));
            clear('amount');
          }}
          className="self-start rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none transition hover:border-ink/40 focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          {t('loans.payAll', { amount: remainingText })}
        </button>
      </div>

      <FormField
        label={t('loans.paymentDate')}
        type="date"
        min={sentOn}
        max={todayLocal()}
        value={paidAt}
        onChange={(event) => {
          setPaidAt(event.target.value);
          clear('paidAt');
        }}
        error={errors.paidAt}
      />

      <FormField
        label={<span>{t('loans.paymentNote')} <span className="font-normal text-muted">({t('loans.optional')})</span></span>}
        value={note}
        maxLength={200}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t('loans.paymentNotePlaceholder')}
      />

      <ProofPicker label={<span className="text-sm font-medium text-ink">{t('loans.photoProof')} <span className="font-normal text-muted">({t('loans.optional')})</span></span>} file={file} onChange={setFile} />

      <ErrorSlot />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">
          {t('common.cancel')}
        </button>
        <div className="sm:w-40">
          <Button type="submit" loading={busy} loadingLabel={t('common.saving')}>
            {t('loans.paymentSave')}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default PaymentForm;
