import { AlertCircle, Check, Info, Loader2, Plus, X } from 'lucide-react';
import FieldError from '../FieldError.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { TAX_YEAR } from '../../utils/fbrTax.js';
import { calculateCuts, supportsTax } from '../../utils/salaryCuts.js';

const MAX_DEDUCTIONS = 10;

const cleanNumber = (raw) => {
  const value = String(raw).replace(/[^0-9.]/g, '');
  const parts = value.split('.');
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : value;
};

const rowIssue = (item) => {
  if (!String(item.name || '').trim()) return 'income.errDeductionName';
  const number = Number(item.value);
  if (item.value === '' || item.value === undefined || !Number.isFinite(number) || number <= 0) return 'income.errDeductionValue';
  return null;
};

const roundText = (number) => String(Math.round(number * 100) / 100);

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

const inputClass =
  'w-full rounded-lg border border-border bg-white py-2.5 text-base text-ink outline-none transition placeholder:text-muted/70 hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';

function DeductionRow({ item, salary, currency, onChange, onRemove }) {
  const { t } = useTranslation();
  const typed = item.value === '' || item.value === undefined ? '' : String(item.value);
  const number = Number(typed);
  const hasNumber = typed !== '' && Number.isFinite(number);

  const amountText = item.kind === 'fixed' ? typed : hasNumber ? roundText((salary * number) / 100) : '';
  const percentText = item.kind === 'percent' ? typed : hasNumber && salary > 0 ? roundText((number / salary) * 100) : '';

  const issue = rowIssue(item);

  return (
    <div className={`flex flex-col gap-2 rounded-xl border bg-white p-2.5 ${issue ? 'border-red-200' : 'border-border'}`}>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_9.5rem_7rem_auto] sm:items-center">
      <input
        value={item.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder={t('income.deductionNamePlaceholder')}
        aria-label={t('income.deductionName')}
        maxLength={60}
        className={`${inputClass} px-3 sm:col-span-1`}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('income.removeDeduction')}
        className="flex h-10 w-10 items-center justify-center self-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600 sm:order-4"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="relative col-span-2 grid grid-cols-2 gap-2 sm:contents">
        <div className="relative">
          <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">{currency}</span>
          <input
            inputMode="decimal"
            value={amountText}
            onChange={(e) => onChange({ kind: 'fixed', value: cleanNumber(e.target.value) })}
            placeholder={t('income.deductionAmountPlaceholder')}
            aria-label={t('income.deductionAmount')}
            className={`${inputClass} ps-12 pe-3 tabular-nums`}
          />
        </div>
        <div className="relative">
          <input
            inputMode="decimal"
            value={percentText}
            onChange={(e) => {
              const cleaned = cleanNumber(e.target.value);
              onChange({ kind: 'percent', value: Number(cleaned) > 100 ? '100' : cleaned });
            }}
            placeholder={t('income.deductionPercentPlaceholder')}
            aria-label={t('income.deductionPercent')}
            className={`${inputClass} ps-3 pe-8 tabular-nums`}
          />
          <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">%</span>
        </div>
      </div>
    </div>
      <FieldError>{issue ? t(issue) : ''}</FieldError>
    </div>
  );
}

function StatusLine({ status }) {
  const { t } = useTranslation();
  if (!status) return null;
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('income.saving')}
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
        <AlertCircle className="h-3.5 w-3.5" /> {t('income.notSaved')}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <Check className="h-3.5 w-3.5" /> {t('income.saved')}
    </span>
  );
}

function SalaryCutsPanel({ stream, onChange, status }) {
  const { t } = useTranslation();
  const { formatMoney, formatPercent } = useFormat();
  const money = (value) => formatMoney(value, { decimals: 0, currency: stream.currency });

  const taxAvailable = supportsTax(stream);
  const taxOn = taxAvailable && Boolean(stream.taxEnabled);
  const anyCuts = taxOn || stream.deductionsEnabled;
  const result = anyCuts ? calculateCuts(stream) : null;
  const deductions = stream.deductions || [];

  const updateDeduction = (index, patch) => {
    onChange({ deductions: deductions.map((item, i) => (i === index ? { ...item, ...patch } : item)) }, { immediate: false });
  };

  const rows = result
    ? [
        { key: 'gross', label: t('income.beforeCuts'), monthly: result.monthly.gross, yearly: result.yearly.gross },
        ...(taxOn ? [{ key: 'tax', label: t('income.taxCut'), monthly: result.monthly.tax, yearly: result.yearly.tax }] : []),
        ...result.yearly.deductions.map((item, index) => ({
          key: `d${index}`,
          label: item.name || t('income.deductionNamePlaceholder'),
          monthly: result.monthly.deductions[index].amount,
          yearly: item.amount,
        })),
      ]
    : [];

  const blocked = Boolean(stream.deductionsEnabled) && (deductions.length === 0 || deductions.some((item) => rowIssue(item)));
  const cell = 'text-end tabular-nums text-ink';

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-3.5 sm:p-4">
      {taxAvailable && (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{t('income.afterTax')}</p>
            {taxOn && result && (
              <p className="mt-0.5 text-xs text-muted">
                {t('income.taxRate')} {formatPercent(Math.round((result.yearly.tax / result.yearly.gross) * 10000) / 10000)} · {t('income.taxSource', { year: TAX_YEAR })}
              </p>
            )}
          </div>
          <Switch checked={taxOn} onChange={(on) => onChange({ taxEnabled: on }, { immediate: true })} label={t('income.afterTax')} />
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">{t('income.deductions')}</p>
        <Switch
          checked={Boolean(stream.deductionsEnabled)}
          onChange={(on) =>
            onChange(on && deductions.length === 0 ? { deductionsEnabled: true, deductions: [{ name: '', kind: 'fixed', value: '' }] } : { deductionsEnabled: on }, { immediate: true })
          }
          label={t('income.deductions')}
        />
      </div>

      {stream.deductionsEnabled && (
        <div className="flex flex-col gap-2">
          {deductions.map((item, index) => (
            <DeductionRow
              key={index}
              item={item}
              salary={stream.expectedAmount}
              currency={stream.currency}
              onChange={(patch) => updateDeduction(index, patch)}
              onRemove={() => onChange({ deductions: deductions.filter((_, i) => i !== index) }, { immediate: true })}
            />
          ))}
          {deductions.length < MAX_DEDUCTIONS && (
            <button
              type="button"
              onClick={() => onChange({ deductions: [...deductions, { name: '', kind: 'fixed', value: '' }] }, { immediate: false })}
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

          <div className="flex flex-col gap-2">
            {stream.deductFromTotal ? (
              <div className="flex gap-2">
                <div className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink px-4 py-3 text-sm font-medium text-white">
                  <Check className="h-4 w-4" /> {t('income.deductedFromSalary')}
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ deductFromTotal: false }, { immediate: true })}
                  className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium text-ink transition hover:bg-surface"
                >
                  {t('income.undo')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={blocked}
                onClick={() => onChange({ deductFromTotal: true }, { immediate: true })}
                className="rounded-lg border border-ink bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:border-border disabled:bg-surface disabled:text-muted disabled:hover:bg-surface disabled:hover:text-muted"
              >
                {t('income.deductFromSalary')}
              </button>
            )}
            {blocked && (
              <p className="flex items-start gap-1.5 text-xs text-muted">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" /> {t('income.deductHint')}
              </p>
            )}
            <div className="flex min-h-[1rem] justify-end">
              <StatusLine status={status} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SalaryCutsPanel;
