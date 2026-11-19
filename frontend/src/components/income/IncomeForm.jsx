import { useMemo, useState } from 'react';
import Button from '../Button.jsx';
import FormField from '../FormField.jsx';
import Combobox from '../Combobox.jsx';
import Select from '../Select.jsx';
import BrandMark from '../BrandMark.jsx';
import FieldError from '../FieldError.jsx';
import { Landmark, Smartphone } from 'lucide-react';
import RupeeNote from '../icons/RupeeNote.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { todayInput, toInputDate } from '../../utils/dates.js';
import { PAKISTANI_BANKS, DIGITAL_WALLETS } from '../../utils/paymentBrands.js';
import { INCOME_TYPES, FREQUENCIES, METHODS, OTHER_VALUE, typeLabelKey, frequencyLabelKey, detailKind } from './incomeOptions.js';
import ErrorSlot from '../ErrorSlot.jsx';

const METHOD_ICON = { cash: RupeeNote, bank: Landmark, wallet: Smartphone };

const resolvePreset = (method, name) => {
  const list = method === 'bank' ? PAKISTANI_BANKS : method === 'wallet' ? DIGITAL_WALLETS : [];
  if (!name) return list.length ? '' : OTHER_VALUE;
  return list.some((item) => item.name === name) ? name : OTHER_VALUE;
};

export const emptyForm = (defaultCurrency) => ({
  name: '',
  incomeType: 'salaried',
  typeDetail: '',
  payerName: '',
  receivedAt: todayInput(),
  frequency: 'monthly',
  destinationMethod: 'bank',
  destinationPreset: '',
  destinationCustom: '',
  expectedAmount: '',
  currency: defaultCurrency || 'PKR',
});

export const formFromStream = (stream) => {
  const preset = resolvePreset(stream.destinationMethod, stream.destinationName);
  return {
    name: stream.name,
    incomeType: stream.incomeType === 'freelance' ? 'business' : stream.incomeType,
    typeDetail: stream.typeDetail || '',
    payerName: stream.payerName || '',
    receivedAt: toInputDate(stream.receivedAt),
    frequency: stream.frequency,
    destinationMethod: stream.destinationMethod,
    destinationPreset: preset,
    destinationCustom: preset === OTHER_VALUE ? stream.destinationName || '' : '',
    expectedAmount: stream.expectedAmount === null ? '' : String(stream.expectedAmount),
    currency: stream.currency,
  };
};

function StepLabel({ n, children }) {
  return (
    <span className="flex items-center gap-2 text-sm font-medium text-ink">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-muted">
        {n}
      </span>
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label}
      {children}
    </div>
  );
}

function IncomeForm({ initial, currencies, onCancel, onSubmit, submitLabel, busy }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const kind = detailKind(form.incomeType);
  const destinationList = form.destinationMethod === 'bank' ? PAKISTANI_BANKS : DIGITAL_WALLETS;
  const showPicker = form.destinationMethod !== 'cash';
  const showCustom = showPicker && form.destinationPreset === OTHER_VALUE;

  const typeItems = useMemo(() => INCOME_TYPES.map((type) => ({ value: type, label: t(typeLabelKey(type)) })), [t]);
  const frequencyItems = useMemo(() => FREQUENCIES.map((freq) => ({ value: freq, label: t(frequencyLabelKey(freq)) })), [t]);

  const destinationItems = useMemo(
    () => [
      ...destinationList.map((item) => ({
        value: item.name,
        label: item.name,
        icon: <BrandMark method={form.destinationMethod} name={item.name} size="sm" />,
      })),
      { value: OTHER_VALUE, label: t('income.otherOption') },
    ],
    [destinationList, form.destinationMethod, t]
  );

  const validate = () => {
    const found = {};
    if (!form.name.trim()) found.name = t('income.errName');
    if (form.expectedAmount !== '' && !(Number(form.expectedAmount) >= 0)) found.expectedAmount = t('income.errAmount');
    if (!form.receivedAt || form.receivedAt > todayInput()) found.receivedAt = t('income.errDate');
    if (!form.currency) found.currency = t('income.errCurrency');
    if (form.destinationMethod !== 'cash') {
      if (!form.destinationPreset) found.destinationPreset = t('income.errDestination');
      else if (form.destinationPreset === OTHER_VALUE && !form.destinationCustom.trim()) found.destinationCustom = t('income.errCustom');
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const submit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    const destinationName =
      form.destinationMethod === 'cash' ? '' : form.destinationPreset === OTHER_VALUE ? form.destinationCustom.trim() : form.destinationPreset;

    onSubmit({
      name: form.name,
      incomeType: form.incomeType,
      typeDetail: form.typeDetail,
      payerName: form.payerName,
      receivedAt: form.receivedAt,
      frequency: form.frequency,
      destinationMethod: form.destinationMethod,
      destinationName,
      expectedAmount: form.expectedAmount,
      currency: form.currency,
    });
  };

  const pickMethod = (destinationMethod) => {
    setForm((f) => ({ ...f, destinationMethod, destinationPreset: '', destinationCustom: '' }));
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-2xl border border-border bg-white p-4 sm:p-6">
      <FormField
        label={<StepLabel n={1}>{t('income.nameLabel')}</StepLabel>}
        value={form.name}
        onChange={(e) => set('name')(e.target.value)}
        placeholder={t('income.namePlaceholder')}
        error={errors.name}
        autoFocus
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label={<StepLabel n={2}>{t('income.expectedAmountLabel')}</StepLabel>}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={form.expectedAmount}
          onChange={(e) => set('expectedAmount')(e.target.value)}
          placeholder={t('income.expectedAmountPlaceholder')}
          error={errors.expectedAmount}
        />
        <Field label={<span className="text-sm font-medium text-ink sm:pl-7">{t('income.currencyLabel')}</span>}>
          <Combobox
            items={currencies}
            ariaLabel={t('income.currencyLabel')}
            placeholder={t('income.currencyPlaceholder')}
            value={form.currency}
            onChange={set('currency')}
          />
          <FieldError>{errors.currency}</FieldError>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={<StepLabel n={3}>{t('income.typeLabel')}</StepLabel>}>
          <Select items={typeItems} value={form.incomeType} onChange={set('incomeType')} ariaLabel={t('income.typeLabel')} />
        </Field>
        <Field label={<StepLabel n={4}>{t('income.frequencyLabel')}</StepLabel>}>
          <Select items={frequencyItems} value={form.frequency} onChange={set('frequency')} ariaLabel={t('income.frequencyLabel')} />
        </Field>
      </div>

      <FormField
        label={<span className="text-sm font-medium text-ink">{t(`income.detail${kind}Label`)}</span>}
        value={form.typeDetail}
        onChange={(e) => set('typeDetail')(e.target.value)}
        placeholder={t(`income.detail${kind}Placeholder`)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label={<StepLabel n={5}>{t('income.payerLabel')}</StepLabel>}
          value={form.payerName}
          onChange={(e) => set('payerName')(e.target.value)}
          placeholder={t('income.payerPlaceholder')}
        />
        <FormField
          label={<StepLabel n={6}>{t('income.receivedLabel')}</StepLabel>}
          type="date"
          max={todayInput()}
          value={form.receivedAt}
          onChange={(e) => set('receivedAt')(e.target.value)}
          error={errors.receivedAt}
        />
      </div>

      <div className="flex flex-col gap-3">
        <span id="income-method-label">
          <StepLabel n={7}>{t('income.destinationMethodLabel')}</StepLabel>
        </span>
        <div role="radiogroup" aria-labelledby="income-method-label" className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
          {METHODS.map((method) => {
            const active = form.destinationMethod === method;
            const Icon = METHOD_ICON[method];
            return (
              <button
                key={method}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pickMethod(method)}
                className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-sm font-medium transition ${
                  active ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon className="hidden h-4 w-4 shrink-0 sm:block" />
                <span className="truncate">{t(`income.method.${method}`)}</span>
              </button>
            );
          })}
        </div>

        {showPicker && (
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface/40 p-3.5">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">
                {form.destinationMethod === 'bank' ? t('income.destinationBankLabel') : t('income.destinationWalletLabel')}
              </span>
              <Combobox
                items={destinationItems}
                ariaLabel={form.destinationMethod === 'bank' ? t('income.destinationBankLabel') : t('income.destinationWalletLabel')}
                placeholder={form.destinationMethod === 'bank' ? t('income.bankPlaceholder') : t('income.walletPlaceholder')}
                value={form.destinationPreset}
                onChange={set('destinationPreset')}
              />
              <FieldError>{errors.destinationPreset}</FieldError>
            </div>
            {showCustom && (
              <FormField
                label={t('income.otherDestinationLabel')}
                value={form.destinationCustom}
                onChange={(e) => set('destinationCustom')(e.target.value)}
                placeholder={t('income.otherDestinationPlaceholder')}
                error={errors.destinationCustom}
              />
            )}
          </div>
        )}
      </div>

      <ErrorSlot />

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink"
        >
          {t('common.cancel')}
        </button>
        <div className="sm:w-40">
          <Button type="submit" loading={busy} loadingLabel={t('common.saving')}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default IncomeForm;
