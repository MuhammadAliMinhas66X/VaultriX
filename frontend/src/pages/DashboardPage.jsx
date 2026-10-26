// The real Dashboard - this is the "central point of gravity" the rest of
// the product is being built around. A user adds their money streams
// (accounts, cards, cash, whatever holds a balance) here; the sum of all
// of them is the number everything else - transactions, budgets, reports,
// once they exist - moves relative to.
import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import AppShell from '../components/AppShell.jsx';
import Button from '../components/Button.jsx';
import FormField from '../components/FormField.jsx';
import Combobox from '../components/Combobox.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { notify } from '../i18n/notifications.js';
import { listAccounts, createAccount, updateAccount, deleteAccount } from '../services/accountService.js';

const ACCOUNT_TYPES = ['checking', 'savings', 'cash', 'credit_card', 'investment', 'other'];

const emptyForm = (defaultCurrency) => ({
  name: '',
  type: 'checking',
  currency: defaultCurrency || 'USD',
  balance: '',
});

function AccountForm({ initial, currencies, onCancel, onSubmit, submitLabel, busy }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);

  const submit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <FormField
        label={t('dashboard.streamNameLabel')}
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        placeholder={t('dashboard.streamNamePlaceholder')}
        autoFocus
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('dashboard.streamTypeLabel')}</span>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`dashboard.type${type.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase())}`)}
              </option>
            ))}
          </select>
        </label>
        <FormField
          label={t('dashboard.startingBalanceLabel')}
          type="number"
          step="0.01"
          value={form.balance}
          onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
          placeholder="0.00"
        />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t('dashboard.streamCurrencyLabel')}</span>
        <Combobox items={currencies} value={form.currency} onChange={(value) => setForm((f) => ({ ...f, currency: value }))} />
      </label>
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

function DashboardPage() {
  const { user, currency } = useAuth();
  const { t, tServer } = useTranslation();
  const { formatMoney } = useFormat();
  const { currencies } = useLocalizedOptions();

  const [accounts, setAccounts] = useState([]);
  const [totals, setTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAccounts();
      setAccounts(result.accounts);
      setTotals(result.totals);
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (form) => {
    setBusy(true);
    try {
      await createAccount(form);
      notify.success(t('dashboard.addStream'));
      setAdding(false);
      await load();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (id, form) => {
    setBusy(true);
    try {
      await updateAccount(id, form);
      setEditingId(null);
      await load();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (account) => {
    if (!window.confirm(t('dashboard.deleteConfirm', { name: account.name }))) return;
    try {
      await deleteAccount(account.id);
      await load();
    } catch (error) {
      notify.error(tServer(error));
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t('dashboard.greeting', { name: user?.name || '' })}</h1>
          <p className="mt-1 text-sm text-muted">{t('dashboard.subtitle')}</p>
        </div>

        {/* The "central point of gravity" - one hero number per currency in
            use (almost always just one), everything else on this page
            exists to feed this. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {loading ? (
            <div className="rounded-2xl border border-border bg-white px-6 py-8 text-center text-sm text-muted sm:col-span-2">
              {t('common.loading')}
            </div>
          ) : totals.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white px-6 py-8 text-center sm:col-span-2">
              <Wallet className="mx-auto h-6 w-6 text-muted" />
              <p className="mt-3 text-base font-medium text-ink">{t('dashboard.emptyTitle')}</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{t('dashboard.emptySubtitle')}</p>
            </div>
          ) : (
            totals.map((total) => (
              <div key={total.currency} className="rounded-2xl border border-border bg-white px-6 py-5">
                <p className="text-[11px] uppercase tracking-wide text-muted">{t('dashboard.totalLabel')}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-ink">
                  {formatMoney(total.total, { decimals: 2, currency: total.currency })}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {accounts.length === 1 ? t('dashboard.acrossOne') : t('dashboard.acrossMany', { count: accounts.length })}
          </h2>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-medium text-white transition hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> {t('dashboard.addStream')}
            </button>
          )}
        </div>

        {adding && (
          <AccountForm
            initial={emptyForm(currency)}
            currencies={currencies}
            onCancel={() => setAdding(false)}
            onSubmit={handleCreate}
            submitLabel={t('dashboard.save')}
            busy={busy}
          />
        )}

        {!loading && accounts.length > 0 && (
          <ul className="flex flex-col gap-2">
            {accounts.map((account) =>
              editingId === account.id ? (
                <li key={account.id}>
                  <AccountForm
                    initial={{ name: account.name, type: account.type, currency: account.currency, balance: String(account.balance) }}
                    currencies={currencies}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(form) => handleUpdate(account.id, form)}
                    submitLabel={t('dashboard.save')}
                    busy={busy}
                  />
                </li>
              ) : (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: account.color }} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{account.name}</p>
                      <p className="truncate text-xs text-muted">
                        {t(`dashboard.type${account.type.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase())}`)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-medium text-ink">{formatMoney(account.balance, { decimals: 2, currency: account.currency })}</span>
                    <button
                      type="button"
                      onClick={() => setEditingId(account.id)}
                      aria-label={t('dashboard.edit')}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(account)}
                      aria-label={t('dashboard.delete')}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

export default DashboardPage;
