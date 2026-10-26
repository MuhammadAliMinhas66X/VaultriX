// Income - separate from the Dashboard's money streams (where balances
// live) on purpose, now its own page reached from the sidebar, so the two
// don't read as duplicates of each other. Every field here is a dropdown
// wherever the answer is one of a known set (type, frequency, where it's
// received) with a free-text escape hatch ("Other") rather than a locked
// list - no icons, plain text + a small color dot per type, consistent
// with how Accounts already mark themselves on the Dashboard.
import { useCallback, useEffect, useState } from 'react';
import { Banknote, Pencil, Plus, Trash2 } from 'lucide-react';
import AppShell from '../components/AppShell.jsx';
import Button from '../components/Button.jsx';
import FormField from '../components/FormField.jsx';
import Combobox from '../components/Combobox.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { useAuth } from '../context/AuthContext.jsx';
import { notify } from '../i18n/notifications.js';
import {
  listIncomeStreams,
  createIncomeStream,
  updateIncomeStream,
  deleteIncomeStream,
} from '../services/incomeStreamService.js';

// Plain names only (no logos) - proper nouns, so these aren't translated
// per-language, just like a bank's name doesn't change because the app
// is in French.
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

const typeLabelKey = (type) => `income.type.${type}`;
const frequencyLabelKey = (freq) => `income.frequency.${freq}`;

// Did this stream's saved destination name come from the known list, or
// did the person type their own? Decides whether the dropdown shows a
// preset or falls to "Other" with the free-text box open.
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
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      <FormField
        label={t('income.nameLabel')}
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        placeholder={t('income.namePlaceholder')}
        autoFocus
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('income.typeLabel')}</span>
          <select
            value={form.incomeType}
            onChange={(e) => setForm((f) => ({ ...f, incomeType: e.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
          >
            {INCOME_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(typeLabelKey(type))}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('income.frequencyLabel')}</span>
          <select
            value={form.frequency}
            onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
          >
            {FREQUENCIES.map((freq) => (
              <option key={freq} value={freq}>
                {t(frequencyLabelKey(freq))}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="-mt-2 text-xs text-muted">{t('income.frequencyHint')}</p>

      <FormField
        label={t('income.typeDetailLabel')}
        value={form.typeDetail}
        onChange={(e) => setForm((f) => ({ ...f, typeDetail: e.target.value }))}
        placeholder={t('income.typeDetailPlaceholder')}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t('income.destinationMethodLabel')}</span>
        <select
          value={form.destinationMethod}
          onChange={(e) => pickMethod(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="cash">{t('income.method.cash')}</option>
          <option value="bank">{t('income.method.bank')}</option>
          <option value="wallet">{t('income.method.wallet')}</option>
        </select>
      </div>

      {showDestinationPicker && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">
            {form.destinationMethod === 'bank' ? t('income.destinationBankLabel') : t('income.destinationWalletLabel')}
          </span>
          <select
            value={form.destinationPreset}
            onChange={(e) => setForm((f) => ({ ...f, destinationPreset: e.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
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
          </select>
        </div>
      )}

      {showCustomField && (
        <FormField
          label={t('income.otherDestinationLabel')}
          value={form.destinationCustom}
          onChange={(e) => setForm((f) => ({ ...f, destinationCustom: e.target.value }))}
          placeholder={t('income.otherDestinationPlaceholder')}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <FormField
          label={t('income.expectedAmountLabel')}
          type="number"
          step="0.01"
          min="0"
          value={form.expectedAmount}
          onChange={(e) => setForm((f) => ({ ...f, expectedAmount: e.target.value }))}
          placeholder={t('income.expectedAmountPlaceholder')}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('income.currencyLabel')}</span>
          <Combobox items={currencies} value={form.currency} onChange={(value) => setForm((f) => ({ ...f, currency: value }))} />
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={busy} loadingLabel={t('common.saving')}>
          {submitLabel}
        </Button>
        <button type="button" onClick={onCancel} className="text-sm text-muted hover:text-ink">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

function IncomePage() {
  const { currency } = useAuth();
  const { t, tServer } = useTranslation();
  const { formatMoney } = useFormat();
  const { currencies } = useLocalizedOptions();

  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

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
    <AppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{t('income.pageTitle')}</h1>
            <p className="mt-1 text-sm text-muted">{t('income.pageSubtitle')}</p>
          </div>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-medium text-white transition hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> {t('income.add')}
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
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-8 text-center">
            <Banknote className="mx-auto h-6 w-6 text-muted" />
            <p className="mt-3 text-base font-medium text-ink">{t('income.emptyTitle')}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{t('income.emptySubtitle')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
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

              return (
                <li key={stream.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3.5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{stream.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <span className="rounded-full bg-surface px-2 py-0.5 font-medium">{t(typeLabelKey(stream.incomeType))}</span>
                        <span className="rounded-full bg-surface px-2 py-0.5 font-medium">{t(frequencyLabelKey(stream.frequency))}</span>
                        <span className="rounded-full bg-surface px-2 py-0.5 font-medium">{destinationLabel(stream)}</span>
                      </div>
                      {stream.typeDetail && <p className="mt-1.5 text-sm text-muted">{stream.typeDetail}</p>}
                      {stream.expectedAmount !== null && (
                        <p className="mt-1.5 text-sm font-medium text-ink">
                          {formatMoney(stream.expectedAmount, { decimals: 2, currency: stream.currency })}
                          <span className="ml-1 font-normal text-muted">{t('income.perOccurrence')}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(stream.id)}
                      aria-label={t('income.edit')}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(stream)}
                      aria-label={t('income.delete')}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

export default IncomePage;
