import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Pencil, Plus, Trash2 } from 'lucide-react';
import DashboardTopBar from '../components/DashboardTopBar.jsx';
import Button from '../components/Button.jsx';
import FormField from '../components/FormField.jsx';
import Combobox from '../components/Combobox.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { notify } from '../i18n/notifications.js';
import {
  listIncomeStreams,
  createIncomeStream,
  updateIncomeStream,
  deleteIncomeStream,
} from '../services/incomeStreamService.js';
import { getExchangeRates } from '../services/fxService.js';

// Plain names only (no logos) - proper nouns, not translated per-language.
const PAKISTANI_BANKS = [
  'Habib Bank Limited (HBL)',
  'United Bank Limited (UBL)',
  'MCB Bank',
  'Allied Bank Limited (ABL)',
  'National Bank of Pakistan (NBP)',
  'Bank Alfalah',
  'Meezan Bank',
  'Faysal Bank',
  'Askari Bank',
  'Bank Al Habib',
  'Soneri Bank',
  'JS Bank',
  'Standard Chartered Pakistan',
  'Habib Metropolitan Bank',
  'Silk Bank',
  'Summit Bank',
  'BankIslami Pakistan',
  'Dubai Islamic Bank Pakistan',
  'Al Baraka Bank Pakistan',
  'The Bank of Punjab',
  'The Bank of Khyber',
  'Sindh Bank',
  'First Women Bank',
  'MyBank',
];

const DIGITAL_WALLETS = ['JazzCash', 'Easypaisa', 'NayaPay', 'SadaPay', 'UPaisa', 'Konnect by HBL', 'Zindigi'];

const OTHER_VALUE = '__other__';

const TYPE_COLOR = {
  salaried: '#1a1a1e',
  business: '#059669',
  freelance: '#0891b2',
  other: '#7c3aed',
};

const INCOME_TYPES = ['salaried', 'business', 'freelance', 'other'];
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'variable'];
const METHODS = ['cash', 'bank', 'wallet'];

const typeLabelKey = (type) => `income.type.${type}`;
const frequencyLabelKey = (freq) => `income.frequency.${freq}`;

const resolvePreset = (method, name) => {
  const list = method === 'bank' ? PAKISTANI_BANKS : method === 'wallet' ? DIGITAL_WALLETS : [];
  if (!name) return list.length ? '' : OTHER_VALUE;
  return list.includes(name) ? name : OTHER_VALUE;
};

const emptyForm = (defaultCurrency) => ({
  name: '',
  incomeType: 'salaried',
  typeDetail: '',
  frequency: 'monthly',
  destinationMethod: 'bank',
  destinationPreset: '',
  destinationCustom: '',
  expectedAmount: '',
  currency: defaultCurrency || 'PKR',
});

const formFromStream = (stream) => ({
  name: stream.name,
  incomeType: stream.incomeType,
  typeDetail: stream.typeDetail || '',
  frequency: stream.frequency,
  destinationMethod: stream.destinationMethod,
  destinationPreset: resolvePreset(stream.destinationMethod, stream.destinationName),
  destinationCustom:
    resolvePreset(stream.destinationMethod, stream.destinationName) === OTHER_VALUE ? stream.destinationName || '' : '',
  expectedAmount: stream.expectedAmount === null ? '' : String(stream.expectedAmount),
  currency: stream.currency,
});

const selectClass =
  'w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <select value={value} onChange={onChange} className={selectClass}>
        {children}
      </select>
    </label>
  );
}

function IncomeStreamForm({ initial, currencies, onCancel, onSubmit, submitLabel, busy }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);

  const destinationList = form.destinationMethod === 'bank' ? PAKISTANI_BANKS : DIGITAL_WALLETS;
  const showDestinationPicker = form.destinationMethod !== 'cash';
  const showCustomField = showDestinationPicker && form.destinationPreset === OTHER_VALUE;

  const submit = (event) => {
    event.preventDefault();
    const destinationName =
      form.destinationMethod === 'cash'
        ? ''
        : form.destinationPreset === OTHER_VALUE
        ? form.destinationCustom.trim()
        : form.destinationPreset;

    onSubmit({
      name: form.name,
      incomeType: form.incomeType,
      typeDetail: form.typeDetail,
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
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-border bg-white p-4 sm:p-6">
      <FormField
        label={t('income.nameLabel')}
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        placeholder={t('income.namePlaceholder')}
        autoFocus
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label={t('income.typeLabel')}
          value={form.incomeType}
          onChange={(e) => setForm((f) => ({ ...f, incomeType: e.target.value }))}
        >
          {INCOME_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(typeLabelKey(type))}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t('income.frequencyLabel')}
          value={form.frequency}
          onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
        >
          {FREQUENCIES.map((freq) => (
            <option key={freq} value={freq}>
              {t(frequencyLabelKey(freq))}
            </option>
          ))}
        </SelectField>
        <p className="-mt-2 text-xs text-muted sm:col-span-2">{t('income.frequencyHint')}</p>
      </div>

      <FormField
        label={t('income.typeDetailLabel')}
        value={form.typeDetail}
        onChange={(e) => setForm((f) => ({ ...f, typeDetail: e.target.value }))}
        placeholder={t('income.typeDetailPlaceholder')}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink" id="income-method-label">
          {t('income.destinationMethodLabel')}
        </span>
        <div role="radiogroup" aria-labelledby="income-method-label" className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
          {METHODS.map((method) => {
            const active = form.destinationMethod === method;
            return (
              <button
                key={method}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pickMethod(method)}
                className={`rounded-lg px-2 py-2.5 text-sm font-medium transition ${
                  active ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {t(`income.method.${method}`)}
              </button>
            );
          })}
        </div>
      </div>

      {showDestinationPicker && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label={form.destinationMethod === 'bank' ? t('income.destinationBankLabel') : t('income.destinationWalletLabel')}
            value={form.destinationPreset}
            onChange={(e) => setForm((f) => ({ ...f, destinationPreset: e.target.value }))}
          >
            <option value="" disabled>
              {t('income.selectPlaceholder')}
            </option>
            {destinationList.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            <option value={OTHER_VALUE}>{t('income.otherOption')}</option>
          </SelectField>

          {showCustomField && (
            <FormField
              label={t('income.otherDestinationLabel')}
              value={form.destinationCustom}
              onChange={(e) => setForm((f) => ({ ...f, destinationCustom: e.target.value }))}
              placeholder={t('income.otherDestinationPlaceholder')}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label={t('income.expectedAmountLabel')}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={form.expectedAmount}
          onChange={(e) => setForm((f) => ({ ...f, expectedAmount: e.target.value }))}
          placeholder={t('income.expectedAmountPlaceholder')}
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('income.currencyLabel')}</span>
          <Combobox
            items={currencies}
            ariaLabel={t('income.currencyLabel')}
            value={form.currency}
            onChange={(value) => setForm((f) => ({ ...f, currency: value }))}
          />
        </div>
      </div>

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

function DashboardPage() {
  const { currency } = useAuth();
  const { t, tServer } = useTranslation();
  const { formatMoney, formatNumber, formatDate } = useFormat();
  const { currencies } = useLocalizedOptions();

  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [headerLabel, setHeaderLabel] = useState('stream');

  const [rates, setRates] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesStale, setRatesStale] = useState(false);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listIncomeStreams();
      setStreams(result.incomeStreams);
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live exchange rates, base = the app's own currency - lets every
  // stream's amount (in whatever currency it was entered) convert into
  // one honest total, instead of showing several totals or a wrong one.
  useEffect(() => {
    if (!currency) {
      setRatesLoading(false);
      return;
    }
    let cancelled = false;
    setRatesLoading(true);
    getExchangeRates(currency)
      .then((data) => {
        if (cancelled) return;
        setRates(data.rates);
        setRatesStale(Boolean(data.stale));
        setRatesUpdatedAt(data.updatedAt || data.fetchedAt || null);
      })
      .catch(() => {
        if (cancelled) return;
        setRates(null);
      })
      .finally(() => {
        if (!cancelled) setRatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currency]);

  const { total, excludedCount } = useMemo(() => {
    if (!rates) return { total: null, excludedCount: 0 };
    let sum = 0;
    let excluded = 0;
    streams.forEach((stream) => {
      if (stream.expectedAmount === null) return;
      const rate = rates[stream.currency];
      if (!rate) {
        excluded += 1;
        return;
      }
      sum += stream.expectedAmount / rate;
    });
    return { total: sum, excludedCount: excluded };
  }, [streams, rates]);

  const rateLines = useMemo(() => {
    if (!rates) return [];
    const codes = [...new Set(streams.filter((st) => st.expectedAmount !== null).map((st) => st.currency))];
    return codes
      .filter((code) => code !== currency && rates[code])
      .map((code) => ({ code, value: 1 / rates[code] }));
  }, [streams, rates, currency]);

  const convertedAmount = (stream) => {
    if (!rates || stream.expectedAmount === null || stream.currency === currency || !rates[stream.currency]) return null;
    return stream.expectedAmount / rates[stream.currency];
  };

  const handleCreate = async (payload) => {
    setBusy(true);
    try {
      await createIncomeStream(payload);
      notify.success(t('income.added'));
      setAdding(false);
      await load();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (id, payload) => {
    setBusy(true);
    try {
      await updateIncomeStream(id, payload);
      setEditingId(null);
      await load();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (stream) => {
    if (!window.confirm(t('income.deleteConfirm', { name: stream.name }))) return;
    try {
      await deleteIncomeStream(stream.id);
      await load();
    } catch (error) {
      notify.error(tServer(error));
    }
  };

  const destinationLabel = (stream) =>
    stream.destinationMethod === 'cash' ? t('income.method.cash') : stream.destinationName;

  return (
    <div className="min-h-screen bg-surface">
      <DashboardTopBar />
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10">
        <div className="min-w-0">
          <select
            value={headerLabel}
            onChange={(e) => setHeaderLabel(e.target.value)}
            aria-label={t('income.headerStream')}
            className="-ml-1 max-w-full rounded-lg border-none bg-transparent px-1 text-xl font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/20 sm:text-2xl"
          >
            <option value="stream">{t('income.headerStream')}</option>
            <option value="cashflow">{t('income.headerCashFlow')}</option>
          </select>
          <p className="mt-1 text-sm text-muted">{t('income.headerSubtitle')}</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{t('income.totalLabel')}</p>
          {ratesLoading ? (
            <p className="mt-2 text-sm text-muted">{t('income.ratesLoading')}</p>
          ) : total === null ? (
            <p className="mt-2 text-sm text-muted">{t('errors.ratesUnavailable')}</p>
          ) : (
            <>
              <p className="mt-1 break-words text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {formatMoney(total, { decimals: 2, currency })}
              </p>
              {rateLines.length > 0 && (
                <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3 text-xs text-muted">
                  <p>{t('income.totalConvertedNote', { currency })}</p>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {rateLines.map((line) => (
                      <li key={line.code} className="font-medium text-ink">
                        {t('income.rateLine', {
                          from: line.code,
                          rate: formatNumber(line.value, { maximumFractionDigits: line.value < 1 ? 4 : 2 }),
                          to: currency,
                        })}
                      </li>
                    ))}
                  </ul>
                  {ratesUpdatedAt && (
                    <p>{t('income.ratesUpdated', { date: formatDate(new Date(ratesUpdatedAt), { day: 'numeric', month: 'short', year: 'numeric' }) })}</p>
                  )}
                </div>
              )}
              {ratesStale && <p className="mt-2 text-xs text-amber-600">{t('income.totalStaleNote')}</p>}
              {excludedCount > 0 && (
                <p className="mt-1 text-xs text-amber-600">{t('income.rateUnavailableNote', { count: excludedCount, currency })}</p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-sm font-semibold uppercase tracking-wide text-muted">
            {t(headerLabel === 'cashflow' ? 'income.headerCashFlow' : 'income.headerStream')}
          </h2>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> {t('income.add')}
            </button>
          )}
        </div>

        {adding && (
          <IncomeStreamForm
            initial={emptyForm(currency)}
            currencies={currencies}
            onCancel={() => setAdding(false)}
            onSubmit={handleCreate}
            submitLabel={t('income.save')}
            busy={busy}
          />
        )}

        {loading ? (
          <div className="rounded-2xl border border-border bg-white px-6 py-8 text-center text-sm text-muted">{t('common.loading')}</div>
        ) : streams.length === 0 && !adding ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center">
            <Banknote className="mx-auto h-6 w-6 text-muted" />
            <p className="mt-3 text-base font-medium text-ink">{t('income.emptyTitle')}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{t('income.emptySubtitle')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {streams.map((stream) => {
              if (editingId === stream.id) {
                return (
                  <li key={stream.id}>
                    <IncomeStreamForm
                      initial={formFromStream(stream)}
                      currencies={currencies}
                      onCancel={() => setEditingId(null)}
                      onSubmit={(payload) => handleUpdate(stream.id, payload)}
                      submitLabel={t('income.save')}
                      busy={busy}
                    />
                  </li>
                );
              }

              const color = TYPE_COLOR[stream.incomeType] || TYPE_COLOR.other;
              const converted = convertedAmount(stream);

              return (
                <li key={stream.id} className="rounded-2xl border border-border bg-white p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <p className="truncate text-base font-semibold text-ink">{stream.name}</p>
                    </div>
                    <div className="-mr-1.5 -mt-1.5 flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => setEditingId(stream.id)}
                        aria-label={t('income.edit')}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(stream)}
                        aria-label={t('income.delete')}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {stream.expectedAmount !== null && (
                    <div className="mt-2">
                      <p className="break-words text-xl font-semibold tracking-tight text-ink">
                        {formatMoney(stream.expectedAmount, { decimals: 2, currency: stream.currency })}
                        <span className="ml-1.5 text-xs font-normal text-muted">{t('income.perOccurrence')}</span>
                      </p>
                      {converted !== null && (
                        <p className="mt-0.5 text-sm text-muted">{t('income.approx', { amount: formatMoney(converted, { decimals: 2, currency }) })}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span className="rounded-full bg-surface px-2.5 py-1 font-medium">{t(typeLabelKey(stream.incomeType))}</span>
                    <span className="rounded-full bg-surface px-2.5 py-1 font-medium">{t(frequencyLabelKey(stream.frequency))}</span>
                    <span className="max-w-full truncate rounded-full bg-surface px-2.5 py-1 font-medium">{destinationLabel(stream)}</span>
                  </div>

                  {stream.typeDetail && <p className="mt-3 break-words text-sm text-muted">{stream.typeDetail}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
