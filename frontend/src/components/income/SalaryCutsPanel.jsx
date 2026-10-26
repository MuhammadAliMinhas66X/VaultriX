import { Check, Plus, X } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { TAX_YEAR } from '../../utils/fbrTax.js';
import { calculateCuts, supportsTax } from '../../utils/salaryCuts.js';

const MAX_DEDUCTIONS = 10;

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 ${checked ? 'bg-ink' : 'bg-border'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'start-[1.375rem]' : 'start-0.5'}`} />
    </button>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-ink">{label}</p>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-border bg-white px-3 py-2.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';

function DeductionRow({ item, currency, onChange, onRemove }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-white p-2.5 sm:flex-row sm:items-center">
      <input
        value={item.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder={t('income.deductionNamePlaceholder')}
        aria-label={t('income.deductionName')}
        maxLength={60}
        className={`${inputClass} sm:flex-1`}
      />
      <div className="flex items-center gap-2">
        <div role="radiogroup" aria-label={t('income.deductionValue')} className="grid shrink-0 grid-cols-2 gap-0.5 rounded-lg bg-surface p-0.5">
          {['percent', 'fixed'].map((kind) => (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={item.kind === kind}
              onClick={() => onChange({ kind })}
              className={`rounded-md px-2.5 py-2 text-xs font-semibold transition ${item.kind === kind ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {kind === 'percent' ? '%' : currency}
            </button>
          ))}
        </div>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={item.value}
          onChange={(e) => onChange({ value: e.target.value })}
          aria-label={t('income.deductionValue')}
          className={`${inputClass} min-w-0 flex-1 sm:w-28 sm:flex-none`}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('income.removeDeduction')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SalaryCutsPanel({ stream, onChange }) {
  const { t } = useTranslation();
  const { formatMoney, formatPercent } = useFormat();
  const money = (value) => formatMoney(value, { decimals: 0, currency: stream.currency });

  const taxAvailable = supportsTax(stream);
  const anyCuts = (taxAvailable && stream.taxEnabled) || stream.deductionsEnabled;
  const result = anyCuts ? calculateCuts(stream) : null;
  const deductions = stream.deductions || [];

  const updateDeduction = (index, patch) => {
    onChange({ deductions: deductions.map((item, i) => (i === index ? { ...item, ...patch } : item)) }, { immediate: false });
  };

  const addDeduction = () => {
    onChange({ deductions: [...deductions, { name: '', kind: 'percent', value: '' }] }, { immediate: false });
  };

  const removeDeduction = (index) => {
    onChange({ deductions: deductions.filter((_, i) => i !== index) }, { immediate: true });
  };

  const cell = 'text-end tabular-nums text-ink';
  const rows = result
    ? [
        { key: 'gross', label: t('income.beforeCuts'), monthly: result.monthly.gross, yearly: result.yearly.gross },
        ...(taxAvailable && stream.taxEnabled
          ? [{ key: 'tax', label: t('income.taxCut'), monthly: result.monthly.tax, yearly: result.yearly.tax }]
          : []),
        ...result.yearly.deductions.map((item, index) => ({
          key: `d${index}`,
          label: item.name || t('income.deductionNamePlaceholder'),
          monthly: result.monthly.deductions[index].amount,
          yearly: item.amount,
        })),
      ]
    : [];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-3.5 sm:p-4">
      {taxAvailable && <ToggleRow label={t('income.afterTax')} checked={Boolean(stream.taxEnabled)} onChange={(on) => onChange({ taxEnabled: on }, { immediate: true })} />}
      <ToggleRow
        label={t('income.deductions')}
        checked={Boolean(stream.deductionsEnabled)}
        onChange={(on) => onChange({ deductionsEnabled: on }, { immediate: true })}
      />

      {stream.deductionsEnabled && (
        <div className="flex flex-col gap-2">
          {deductions.map((item, index) => (
            <DeductionRow key={index} item={item} currency={stream.currency} onChange={(patch) => updateDeduction(index, patch)} onRemove={() => removeDeduction(index)} />
          ))}
          {deductions.length < MAX_DEDUCTIONS && (
            <button
              type="button"
              onClick={addDeduction}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-white px-3 py-2.5 text-sm font-medium text-muted transition hover:border-ink/30 hover:text-ink"
            >
              <Plus className="h-4 w-4" /> {t('income.addDeduction')}
            </button>
          )}
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-2.5 border-t border-border pt-4 text-sm">
            <span />
            <span className="text-end text-xs font-medium text-muted">{t('income.taxMonthly')}</span>
            <span className="text-end text-xs font-medium text-muted">{t('income.taxYearly')}</span>

            {rows.map((row) => (
              <div key={row.key} className="contents">
                <span className="truncate text-muted">{row.label}</span>
                <span className={cell}>{money(row.monthly)}</span>
                <span className={cell}>{money(row.yearly)}</span>
              </div>
            ))}

            <span className="text-muted">{t('income.totalCuts')}</span>
            <span className={cell}>{money(result.monthly.cuts)}</span>
            <span className={cell}>{money(result.yearly.cuts)}</span>

            <span className="border-t border-border pt-2.5 font-semibold text-ink">{t('income.taxNet')}</span>
            <span className={`${cell} border-t border-border pt-2.5 font-semibold`}>{money(result.monthly.net)}</span>
            <span className={`${cell} border-t border-border pt-2.5 font-semibold`}>{money(result.yearly.net)}</span>
          </div>

          {taxAvailable && stream.taxEnabled && (
            <p className="text-xs text-muted">
              {t('income.taxRate')} {formatPercent(Math.round((result.yearly.tax / result.yearly.gross) * 10000) / 10000)} · {t('income.taxSource', { year: TAX_YEAR })}
            </p>
          )}

          <button
            type="button"
            aria-pressed={Boolean(stream.deductFromTotal)}
            onClick={() => onChange({ deductFromTotal: !stream.deductFromTotal }, { immediate: true })}
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition ${
              stream.deductFromTotal ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink hover:bg-surface'
            }`}
          >
            {stream.deductFromTotal && <Check className="h-4 w-4" />}
            {stream.deductFromTotal ? t('income.deductedFromTotal') : t('income.deductFromTotal')}
          </button>
        </>
      )}
    </div>
  );
}

export default SalaryCutsPanel;
