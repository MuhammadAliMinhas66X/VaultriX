import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, KeyRound, Loader2, Mail, Plus, Receipt, Scale, UserPlus, Users } from 'lucide-react';
import Drawer from '../Drawer.jsx';
import Combobox from '../Combobox.jsx';
import FormField from '../FormField.jsx';
import Button from '../Button.jsx';
import GroupsIcon from './GroupsIcon.jsx';
import BalanceChips from './BalanceChips.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useLocalizedOptions } from '../../i18n/useLocalizedOptions.js';
import { notify } from '../../i18n/notifications.js';
import { useGroupInvites } from '../../hooks/useGroupInvites.js';
import { acceptMyInvite, createGroup, declineMyInvite, joinGroup, listGroups } from '../../services/groupService.js';
import { initialsFromName } from '../../utils/avatar.js';

const field = 'w-full rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';

export function InviteRow({ invite, onDone }) {
  const { t, tServer } = useTranslation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState('');
  const act = async (kind) => {
    setBusy(kind);
    try {
      if (kind === 'accept') {
        const data = await acceptMyInvite(invite.id);
        notify.success(t('groups.joined'));
        onDone();
        navigate(`/groups/${data.id}`);
      } else {
        await declineMyInvite(invite.id);
        notify.success(t('groups.declined'));
        onDone();
      }
    } catch (error) {
      notify.error(tServer(error));
      setBusy('');
    }
  };
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-ink/15 bg-surface px-4 py-3.5 sm:flex-row sm:items-center">
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white"><Mail className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{invite.groupName}</span>
          <span className="block truncate text-xs text-muted">{invite.inviterName ? t('groups.invitedBy', { name: invite.inviterName }) : t('groups.invitedGeneric')} · {t('groups.members', { count: invite.memberCount })}</span>
        </span>
      </span>
      <span className="flex gap-2">
        <button type="button" disabled={Boolean(busy)} onClick={() => act('accept')} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60 sm:flex-none">
          {busy === 'accept' && <Loader2 className="h-4 w-4 animate-spin" />} {t('groups.accept')}
        </button>
        <button type="button" disabled={Boolean(busy)} onClick={() => act('decline')} className="flex flex-1 items-center justify-center rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/30 disabled:opacity-60 sm:flex-none">
          {t('groups.decline')}
        </button>
      </span>
    </li>
  );
}

function AvatarStack({ names }) {
  const shown = names.slice(0, 4);
  return (
    <span className="flex -space-x-2 rtl:space-x-reverse">
      {shown.map((name, index) => (
        <span key={`${name}-${index}`} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-ink text-[10px] font-bold text-white" style={{ opacity: 1 - index * 0.14 }}>{initialsFromName(name)}</span>
      ))}
    </span>
  );
}

// The Groups area: what it is for, invitations, the groups themselves, create and
// join with a code. Lives on the Dashboard and on the full /groups page.
export default function GroupsHub({ full = false }) {
  const { t, tServer } = useTranslation();
  const { currency } = useAuth();
  const { currencies } = useLocalizedOptions();
  const navigate = useNavigate();
  const { invites, refresh } = useGroupInvites();
  const [groups, setGroups] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [groupCurrency, setGroupCurrency] = useState(currency);
  const [busy, setBusy] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    try {
      setGroups((await listGroups()).groups);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const done = () => {
    refresh();
    load();
  };

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

  const steps = [
    { icon: UserPlus, text: t('groups.how1') },
    { icon: Receipt, text: t('groups.how2') },
    { icon: Scale, text: t('groups.how3') },
  ];
  const list = groups || [];
  const shown = full ? list : list.slice(0, 4);

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} id="groups" className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <GroupsIcon />
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-ink">{t('groups.title')}</h2>
            <p className="mt-0.5 text-sm leading-snug text-muted">{t('groups.tagline')}</p>
          </div>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
          <Plus className="h-4 w-4" /> {t('groups.new')}
        </button>
      </div>

      <div className="flex flex-col gap-4 px-5 py-5">
        {invites.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('groups.invitesTitle')}</p>
            <ul className="flex flex-col gap-2">{invites.map((invite) => <InviteRow key={invite.id} invite={invite} onDone={done} />)}</ul>
          </div>
        )}

        {groups === null ? (
          <div className="flex justify-center py-8 text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : list.length === 0 ? (
          <ol className="grid gap-3 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3 rounded-xl bg-surface px-4 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-border"><step.icon className="h-4 w-4" strokeWidth={1.75} /></span>
                <span className="text-sm leading-snug text-ink"><span className="mb-0.5 block text-[11px] font-bold tabular-nums text-muted">{index + 1}</span>{step.text}</span>
              </li>
            ))}
          </ol>
        ) : (
          <ul className={`grid gap-3 ${full ? '' : 'md:grid-cols-2'}`}>
            {shown.map((group) => (
              <li key={group.id}>
                <Link to={`/groups/${group.id}`} className="flex h-full flex-col gap-3 rounded-xl border border-border p-4 outline-none transition hover:border-ink/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-accent/40">
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink"><Users className="h-5 w-5" strokeWidth={1.75} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">{group.name}</span>
                      <span className="block text-xs text-muted">{t('groups.members', { count: group.members })}</span>
                    </span>
                    {group.memberNames && <AvatarStack names={group.memberNames} />}
                  </span>
                  <span className="flex flex-wrap gap-2"><BalanceChips mine={group.mine} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setCodeOpen((open) => !open)} aria-expanded={codeOpen} className="flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
            <KeyRound className="h-4 w-4" /> {t('groups.joinTitle')} <ChevronDown className={`h-4 w-4 transition ${codeOpen ? 'rotate-180' : ''}`} />
          </button>
          {!full && list.length > shown.length && (
            <Link to="/groups" className="flex items-center gap-1.5 text-sm font-semibold text-ink hover:underline">{t('dashboard.viewAll')} <ArrowRight className="h-4 w-4" /></Link>
          )}
        </div>
        {codeOpen && (
          <form onSubmit={join} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">{t('groups.codeLabel')}</span>
              <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="XXXXX-XXXXX" maxLength={12} autoComplete="off" spellCheck={false} className={`${field} font-mono tracking-[0.14em]`} />
            </label>
            <button type="submit" disabled={joining || !code.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} {t('groups.join')}
            </button>
          </form>
        )}
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
    </motion.section>
  );
}
