import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import Combobox from '../Combobox.jsx';
import FieldError from '../FieldError.jsx';
import MoneyInput from '../MoneyInput.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { btn, inputClass } from './ui.js';

const CHIPS = [
  ['salary.chipRent', ''],
  ['salary.chipFood', ''],
  ['salary.chipBills', ''],
  ['salary.chipTransport', ''],
  ['salary.chipFamily', ''],
  ['salary.chipSavings', 'savings'],
];

// Add or edit one allocation. `initial` = { label, amount, category } when editing.
// onSubmit({ label, amount, category }) where category is '', 'savings' or an expense category id.
export default function AllocationForm({ initial, categories, busy, onSubmit, onCancel, bills = [] }) {
  const { t } = useTranslation();
  const editing = Boolean(initial);
  const [label, setLabel] = useState(initial ? initial.label : '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [category, setCategory] = useState(initial ? initial.category : '');
  const [errors, setErrors] = useState({});
  const labelRef = useRef(null);

  useEffect(() => {
    if (editing && labelRef.current) labelRef.current.focus();
  }, [editing]);

  const items = [
    { value: '', label: t('salary.categoryNone') },
    { value: 'savings', label: t('salary.categorySavings') },
    ...categories.map((item) => ({ value: item.id, label: item.name })),
  ];

  const submit = (event) => {
    event.preventDefault();
    const name = label.trim();
    const value = Number(amount);
    const next = {};
    if (!name) next.label = t('salary.errName');
    if (!(value > 0)) next.amount = t('salary.errAmount');
    setErrors(next);
    if (next.label) return labelRef.current && labelRef.current.focus();
    if (next.amount) return undefined;
    onSubmit({ label: name, amount: value, category });
    if (!editing) {
      setLabel('');
      setAmount('');
      setCategory('');
    }
    return undefined;
  };

  const pickChip = (key, chipCategory) => {
    setLabel(t(key));
    setCategory(chipCategory);
    setErrors((prev) => ({ ...prev, label: undefined }));
  };

  return (
    <form onSubmit={submit} noValidate aria-label={editing ? t('salary.editing') : t('salary.addLine')}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_auto] sm:items-start">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t('salary.lineLabel')}</span>
          <input
            ref={labelRef}
            value={label}
            maxLength={40}
            onChange={(event) => {
              setLabel(event.target.value);
              if (errors.label) setErrors((prev) => ({ ...prev, label: undefined }));
            }}
            placeholder={t('salary.lineLabelPlaceholder')}
            aria-invalid={errors.label ? 'true' : undefined}
            aria-describedby={errors.label ? 'alloc-label-err' : undefined}
            className={inputClass(errors.label)}
          />
          <FieldError id="alloc-label-err">{errors.label}</FieldError>
        </label>
        <div className="grid grid-cols-2 gap-3 sm:contents">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">{t('salary.lineAmount')}</span>
            <MoneyInput
              value={amount}
              onChange={(next) => {
                setAmount(next);
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
              }}
              placeholder="0"
              aria-invalid={errors.amount ? 'true' : undefined}
              aria-describedby={errors.amount ? 'alloc-amount-err' : undefined}
              className={`${inputClass(errors.amount)} tabular-nums`}
            />
            <FieldError id="alloc-amount-err">{errors.amount}</FieldError>
          </label>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">{t('salary.category')}</span>
            <Combobox items={items} searchable={items.length > 7} ariaLabel={t('salary.category')} value={category} onChange={setCategory} />
          </div>
        </div>
        <div className="flex gap-2 sm:mt-[22px]">
          <button type="submit" disabled={busy} className={`${btn.primary} flex-1 sm:flex-none`}>
            {!editing && <Plus className="h-4 w-4" />}
            {editing ? t('salary.saveLine') : t('salary.addLine')}
          </button>
          {editing && (
            <button type="button" onClick={onCancel} className={btn.secondaryMd}>
              {t('common.cancel')}
            </button>
          )}
        </div>
      </div>

      {!editing && bills.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t('salary.fromBills')}</span>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0">
            {bills.map((bill) => (
              <button
                key={bill.id}
                type="button"
                onClick={() => {
                  setLabel(bill.label);
                  setAmount(String(bill.amount));
                  setCategory('');
                  setErrors({});
                }}
                className="h-7 shrink-0 whitespace-nowrap rounded-full border border-border px-3 text-xs font-medium text-ink outline-none transition hover:border-ink/40 hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                {bill.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {!editing && (
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0" role="group" aria-label={t('salary.lineLabelPlaceholder')}>
          {CHIPS.map(([key, chipCategory]) => (
            <button key={key} type="button" onClick={() => pickChip(key, chipCategory)} className="h-7 shrink-0 rounded-full border border-border px-3 text-xs font-medium text-muted outline-none transition hover:border-ink/40 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30">
              {t(key)}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
