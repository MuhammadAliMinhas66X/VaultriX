import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Loader2, Plus, Users } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import Drawer from '../components/Drawer.jsx';
import Combobox from '../components/Combobox.jsx';
import FormField from '../components/FormField.jsx';
import Button from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { notify } from '../i18n/notifications.js';
import { createGroup, joinGroup, listGroups } from '../services/groupService.js';

const field = 'w-full rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';

export function BalanceChips({ mine }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();
  if (!mine || mine.length === 0) return <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">{t('groups.settled')}</span>;
  return (
    <>
      {mine.map((row) => (
        <span key={row.currency} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${row.amount > 0 ? 'bg-ink text-white' : 'border border-ink text-ink'}`}>
          {row.amount > 0 ? t('groups.owed', { amount: formatMoney(row.amount, { decimals: 2, currency: row.currency }) }) : t('groups.owe', { amount: formatMoney(-row.amount, { decimals: 2, currency: row.currency }) })}
        </span>
      ))}
    </>
  );
}

export default function GroupsPage() {
  const { t, tServer } = useTranslation();
  const { currency } = useAuth();
  const { currencies } = useLocalizedOptions();
  const { items, activeId } = useAppNav();
  const navigate = useNavigate();
  const [groups, setGroups] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [groupCurrency, setGroupCurrency] = useState(currency);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    try {
      setGroups((await listGroups()).groups);
    } catch (error) {
      notify.error(tServer(error));
      setGroups([]);
    }
  }, [tServer]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const data = await createGroup(name.trim(), groupCurrency);
      notify.success(t('groups.created'));
      navigate(`/groups/${data.id}`);
    } catch (error) {
      notify.error(tServer(error));
      setBusy(false);
    }
  };

  const join = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setJoining(true);
    try {
      const data = await joinGroup(code.trim());
      navigate(`/groups/${data.id}`);
    } catch (error) {
      notify.error(tServer(error));
      setJoining(false);
    }
  };

  return (
    <AppShell showLogo pageTitle={t('groups.title')} items={items} activeId={activeId}>
      <div className="mx-auto w-full max-w-[880px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('groups.title')}</h1>
          <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
            <Plus className="h-4 w-4" /> {t('groups.new')}
          </button>
        </div>

        {groups === null ? (
          <div className="flex justify-center py-16 text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted"><Users className="h-6 w-6" strokeWidth={1.5} /></span>
            <p className="mt-4 text-base font-semibold text-ink">{t('groups.emptyTitle')}</p>
            <p className="mt-1.5 max-w-md text-sm text-muted">{t('groups.emptyBody')}</p>
            <button type="button" onClick={() => setCreating(true)} className="mt-5 flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
              <Plus className="h-4 w-4" /> {t('groups.new')}
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {groups.map((group) => (
              <li key={group.id}>
                <Link to={`/groups/${group.id}`} className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 outline-none transition hover:border-ink/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-accent/40 sm:flex-row sm:items-center">
                  <span className="flex min-w-0 flex-1 items-center gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink"><Users className="h-5 w-5" strokeWidth={1.75} /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold text-ink">{group.name}</span>
                      <span className="block text-sm text-muted">{t('groups.members', { count: group.members })}</span>
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-2"><BalanceChips mine={group.mine} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight text-ink">{t('groups.joinTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('groups.joinHint')}</p>
          <form onSubmit={join} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">{t('groups.codeLabel')}</span>
              <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="XXXXX-XXXXX" maxLength={12} autoComplete="off" spellCheck={false} className={`${field} font-mono tracking-[0.14em]`} />
            </label>
            <button type="submit" disabled={joining || !code.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} {t('groups.join')}
            </button>
          </form>
        </motion.section>
      </div>

      <Drawer open={creating} onClose={() => setCreating(false)} title={t('groups.createTitle')} label={t('groups.createTitle')}>
        <form onSubmit={create} className="flex flex-col gap-5">
          <FormField label={t('groups.nameLabel')} value={name} maxLength={60} autoFocus onChange={(event) => setName(event.target.value)} placeholder={t('groups.namePlaceholder')} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">{t('groups.currencyLabel')}</span>
            <Combobox items={currencies} ariaLabel={t('groups.currencyLabel')} value={groupCurrency} onChange={setGroupCurrency} />
          </div>
          <Button type="submit" loading={busy} loadingLabel={t('common.saving')} disabled={!name.trim()}>
            {t('groups.create')}
          </Button>
        </form>
      </Drawer>
    </AppShell>
  );
}
