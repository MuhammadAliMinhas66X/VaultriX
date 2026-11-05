import { useState } from 'react';
import Button from '../Button.jsx';
import FormField from '../FormField.jsx';
import WherePicker from '../loans/WherePicker.jsx';
import { splitKey, isOtherKey, keyFor, customFor } from '../loans/loanOptions.js';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { todayInput } from '../../utils/dates.js';

function BillPayForm({ bill, busy, onCancel, onSubmit }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();
  const [form, setForm] = useState({
    amount: String(bill.remaining),
    date: todayInput(),
    payKey: keyFor(bill.payMethod, bill.payName),
    payCustom: customFor(bill.payMethod, bill.payName),
    note: '',
  });
  const [errors, setErrors] = useState({});

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const submit = (event) => {
    event.preventDefault();
    const found = {};
    const amount = Number(form.amount);
    if (!form.amount || !(amount > 0)) found.amount = t('loans.errAmount');
    else if (amount > bill.remaining + 0.004) found.amount = t('bills.errOverpay');
    if (!form.date || form.date > todayInput()) found.date = t('loans.errSent');
    if (isOtherKey(form.payKey) && !form.payCustom.trim()) found.payCustom = t('loans.errOther');
    setErrors(found);
    if (Object.keys(found).length) return;
    const where = splitKey(form.payKey, form.payCustom);
    onSubmit({ amount, paidAt: form.date, payMethod: where.method, payName: where.name, note: form.note.trim() });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-xl border border-border bg-surface/60 p-4">
      <p className="text-sm font-semibold text-ink">{t('bills.payTitle')}</p>
      <div className="flex flex-col gap-1.5">
        <FormField
          label={t('bills.payAmount')}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={(event) => set('amount')(event.target.value)}
          error={errors.amount}
        />
        {Number(form.amount) !== bill.remaining && (
          <button type="button" onClick={() => set('amount')(String(bill.remaining))} className="w-fit text-xs font-semibold text-ink underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
            {t('bills.payFull')} · {formatMoney(bill.remaining, { decimals: 2, currency: bill.currency })}
          </button>
        )}
      </div>
      <FormField label={t('bills.payDate')} type="date" max={todayInput()} value={form.date} onChange={(event) => set('date')(event.target.value)} error={errors.date} />
      <WherePicker
        optional
        label={<span className="text-sm font-medium text-ink">{t('bills.sourceLabel')}</span>}
        value={form.payKey}
        custom={form.payCustom}
        onChange={set('payKey')}
        onCustomChange={set('payCustom')}
        customError={errors.payCustom}
      />
      <FormField label={<span>{t('bills.noteLabel')} <span className="font-normal text-muted">({t('loans.optional')})</span></span>} value={form.note} maxLength={200} onChange={(event) => set('note')(event.target.value)} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">
          {t('common.cancel')}
        </button>
        <div className="sm:w-44">
          <Button type="submit" loading={busy} loadingLabel={t('common.saving')}>
            {t('bills.paySave')}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default BillPayForm;
