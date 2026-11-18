import { useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import Combobox from '../Combobox.jsx';
import MoneyInput from '../MoneyInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { notify } from '../../i18n/notifications.js';
import { useResource } from '../../data/useResource.js';
import { CURRENCIES } from '../../utils/options.js';
import { createAccount, updateAccount, deleteAccount } from '../../services/accountService.js';

const NONE = [];
const TYPES = ['checking', 'savings', 'cash', 'credit_card', 'investment', 'other'];
const COLORS = ['#111114', '#f5a83a', '#8b5cf6', '#0ea896', '#2563eb', '#dc2626'];
const card = 'rounded-2xl border border-border bg-white p-4 sm:p-5';
const field = 'w-full rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';

function AccountForm({ account, currency, onDone, onCancel }) {
  const { t, tServer } = useTranslation();
  const [name, setName] = useState(account ? account.name : '');
  const [type, setType] = useState(account ? account.type : 'checking');
  const [code, setCode] = useState(account ? account.currency : currency);
  const [balance, setBalance] = useState(account ? String(account.balance) : '');
  const [color, setColor] = useState(account ? account.color : COLORS[0]);
  const [busy, setBusy] = useState(false);
  const typeItems = TYPES.map((value) => ({ value, label: t(`accounts.type.${value}`) }));
  const currencyItems = CURRENCIES.map((item) => ({ value: item.value, label: item.value, sub: item.label }));
  const valid = name.trim().length > 0;

  const submit = async (event) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const payload = { name: name.trim(), type, currency: code, balance: Number(balance) || 0, color };
      if (account) await updateAccount(account.id, payload);
      else await createAccount(payload);
      notify.success(t('accounts.saved'));
      onDone();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    setBusy(true);
    try {
      await updateAccount(account.id, { isArchived: !account.isArchived });
      onDone();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${card} flex flex-col gap-4`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">{account ? t('accounts.edit') : t('accounts.add')}</h2>
        <button type="button" aria-label={t('common.close')} onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface"><X className="h-4 w-4" /></button>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t('accounts.name')}</span>
        <input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} placeholder={t('accounts.namePlaceholder')} className={field} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('accounts.type')}</span>
          <Combobox items={typeItems} ariaLabel={t('accounts.type')} value={type} onChange={setType} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('accounts.currency')}</span>
          <Combobox items={currencyItems} searchable ariaLabel={t('accounts.currency')} value={code} onChange={setCode} />
        </div>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t('accounts.balance')}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted">{code}</span>
          <MoneyInput allowNegative value={balance} onChange={setBalance} aria-label={t('accounts.balance')} placeholder="0" className={field} />
        </div>
      </label>
      <div className="flex items-center gap-2.5">
        {COLORS.map((value) => (
          <button key={value} type="button" aria-label={value} aria-pressed={color === value} onClick={() => setColor(value)} className={`h-7 w-7 rounded-full transition ${color === value ? 'ring-2 ring-ink ring-offset-2' : 'hover:scale-110'}`} style={{ background: value }} />
        ))}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !valid} className="flex-1 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">{t('reports.save')}</button>
        {account && (
          <button type="button" disabled={busy} onClick={archive} className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-ink transition hover:bg-surface disabled:opacity-50">{account.isArchived ? t('accounts.unarchive') : t('accounts.archive')}</button>
        )}
      </div>
    </form>
  );
}

export default function Accounts({ canWrite }) {
  const { t, tServer } = useTranslation();
  const { formatMoney } = useFormat();
  const { currency } = useAuth();
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null);
  const [asking, setAsking] = useState('');
  const resource = useResource('accounts', { archived: showArchived ? '1' : '0' });
  const accounts = resource.data ? resource.data.accounts : NONE;
  const totals = resource.data ? resource.data.totals : NONE;

  const close = () => setEditing(null);

  const toggleArchive = async (account) => {
    try {
      await updateAccount(account.id, { isArchived: !account.isArchived });
    } catch (error) {
      notify.error(tServer(error));
    }
  };

  const drop = async (account) => {
    if (asking !== account.id) {
      setAsking(account.id);
      return;
    }
    try {
      await deleteAccount(account.id);
    } catch (error) {
      notify.error(tServer(error));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {totals.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {totals.map((row) => (
            <div key={row.currency} className="rounded-2xl bg-ink p-5 text-white">
              <p className="text-xs font-medium text-white/60">{t('accounts.total')} · {row.currency}</p>
              <p className="mt-2 whitespace-nowrap text-2xl font-bold tabular-nums tracking-tight">{formatMoney(row.total, { currency: row.currency })}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-sm text-muted">{t('accounts.hint')}</p>
        <div className="flex items-center gap-2">
          <button type="button" aria-pressed={showArchived} onClick={() => setShowArchived((value) => !value)} className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${showArchived ? 'border-ink text-ink' : 'border-border text-muted hover:text-ink'}`}>{t('accounts.showArchived')}</button>
          {canWrite && editing === null && (
            <button type="button" onClick={() => setEditing('new')} className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"><Plus className="h-4 w-4" />{t('accounts.add')}</button>
          )}
        </div>
      </div>

      {editing !== null && <AccountForm key={editing === 'new' ? 'new' : editing.id} account={editing === 'new' ? null : editing} currency={currency} onDone={close} onCancel={close} />}

      {accounts.length === 0 && editing === null ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
          <p className="max-w-sm text-base font-medium text-ink">{t('accounts.empty')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {accounts.map((account) => (
            <li key={account.id} className={`${card} flex items-center gap-3 ${account.isArchived ? 'opacity-60' : ''}`}>
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: account.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{account.name}</p>
                <p className="text-xs text-muted">{t(`accounts.type.${account.type}`)}{account.isArchived ? ` · ${t('accounts.archived')}` : ''}</p>
              </div>
              <span className={`whitespace-nowrap text-sm font-bold tabular-nums ${account.balance < 0 ? 'text-red-600' : 'text-ink'}`}>{formatMoney(account.balance, { currency: account.currency })}</span>
              {canWrite && (
                <div className="flex shrink-0 items-center gap-0.5">
                  <button type="button" aria-label={t('reports.edit')} onClick={() => setEditing(account)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => toggleArchive(account)} className="hidden h-8 items-center rounded-lg px-2 text-xs font-medium text-muted transition hover:bg-surface hover:text-ink sm:flex">{account.isArchived ? t('accounts.unarchive') : t('accounts.archive')}</button>
                  <button type="button" aria-label={t('reports.remove')} onClick={() => drop(account)} onBlur={() => setAsking('')} className={`flex h-8 items-center justify-center rounded-lg text-xs font-medium transition ${asking === account.id ? 'bg-red-600 px-2.5 text-white' : 'w-8 text-muted hover:bg-surface hover:text-ink'}`}>
                    {asking === account.id ? t('reports.sure') : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
