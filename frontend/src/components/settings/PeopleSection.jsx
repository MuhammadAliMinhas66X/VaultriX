import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, KeyRound, Loader2, Mail, Trash2, UserPlus, X } from 'lucide-react';
import Combobox from '../Combobox.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { notify } from '../../i18n/notifications.js';
import { initialsFromName } from '../../utils/avatar.js';
import { dateOptions } from '../../utils/dates.js';
import { changeMemberRole, createInvite, getTeam, joinWithCode, leaveWorkspace, removeMember, revokeInvite } from '../../services/teamService.js';

const card = 'rounded-xl border border-border bg-white p-5 sm:p-6';
const outline =
  'flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition hover:border-ink/30 hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50';
const solid =
  'flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60';
const field =
  'w-full rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';

function Block({ title, hint, children }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={card}>
      <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}

const roleKey = (role) => `team.role${role[0].toUpperCase()}${role.slice(1)}`;

function MembersBlock({ team, reload }) {
  const { t, tServer } = useTranslation();
  const { formatDate } = useFormat();
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState('');
  const isOwner = team.me.role === 'owner';
  const roleItems = ['admin', 'member', 'viewer'].map((value) => ({ value, label: t(roleKey(value)) }));

  const run = async (key, job, done) => {
    setBusy(key);
    try {
      await job();
      if (done) done();
      else await reload();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy('');
      setConfirm('');
    }
  };

  return (
    <Block title={t('team.membersTitle', { workspace: team.workspace })} hint={t('team.membersHint')}>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {team.members.map((member) => {
          const mine = member.id === team.me.id;
          return (
            <li key={member.id} className="flex flex-col gap-3 px-3.5 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-ink">{initialsFromName(member.name) || '?'}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {member.name} {mine && <span className="font-normal text-muted">({t('team.you')})</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">{member.email} · {formatDate(new Date(member.joinedAt), dateOptions)}</span>
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {member.isOwner || !isOwner ? (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${member.isOwner ? 'bg-ink text-white' : 'bg-surface text-ink ring-1 ring-border'}`}>{t(roleKey(member.role))}</span>
                ) : (
                  <div className="w-36">
                    <Combobox
                      items={roleItems}
                      searchable={false}
                      ariaLabel={t('team.roleFor', { name: member.name })}
                      value={member.role}
                      onChange={(role) => run(`role${member.id}`, () => changeMemberRole(member.id, role))}
                    />
                  </div>
                )}
                {!member.isOwner && (isOwner || (team.me.role === 'admin' && ['member', 'viewer'].includes(member.role))) && !mine &&
                  (confirm === member.id ? (
                    <button type="button" disabled={busy === member.id} onClick={() => run(member.id, () => removeMember(member.id))} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60">
                      {t('team.confirmRemove')}
                    </button>
                  ) : (
                    <button type="button" onClick={() => setConfirm(member.id)} aria-label={t('team.remove', { name: member.name })} className="flex h-10 w-10 items-center justify-center rounded-xl text-muted outline-none transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-accent/40">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">{t('team.roleHelp')}</p>
      {!isOwner && (
        <div className="mt-4">
          {confirm === 'leave' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink">{t('team.leaveAsk')}</span>
              <button type="button" onClick={() => setConfirm('')} className={outline}>{t('common.cancel')}</button>
              <button type="button" disabled={busy === 'leave'} onClick={() => run('leave', leaveWorkspace, () => window.location.assign('/dashboard'))} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60">
                {t('team.leave')}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirm('leave')} className={outline}>{t('team.leave')}</button>
          )}
        </div>
      )}
    </Block>
  );
}

function InviteBlock({ team, reload }) {
  const { t, tServer } = useTranslation();
  const { formatDate } = useFormat();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState(null);
  const [copied, setCopied] = useState(false);
  const owner = team.me.role === 'owner';
  const roleItems = (owner ? ['admin', 'member', 'viewer'] : ['member', 'viewer']).map((value) => ({ value, label: t(roleKey(value)) }));
  const full = team.members.length + team.invites.length >= team.limit;

  const send = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setMade(null);
    try {
      const data = await createInvite(email.trim(), role);
      setMade({ code: data.code, email: email.trim() });
      setEmail('');
      await reload();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(made.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      setCopied(false);
    }
  };

  const revoke = async (id) => {
    try {
      await revokeInvite(id);
      await reload();
    } catch (error) {
      notify.error(tServer(error));
    }
  };

  return (
    <Block title={t('team.inviteTitle')} hint={t('team.inviteHint')}>
      <form onSubmit={send} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('team.emailLabel')}</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('team.emailPlaceholder')} maxLength={160} className={field} disabled={full} />
        </label>
        <div className="flex flex-col gap-1.5 sm:w-40">
          <span className="text-sm font-medium text-ink">{t('team.roleLabel')}</span>
          <Combobox items={roleItems} searchable={false} ariaLabel={t('team.roleLabel')} value={role} onChange={setRole} />
        </div>
        <button type="submit" disabled={busy || full || !email.trim()} className={solid}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} {t('team.sendInvite')}
        </button>
      </form>
      {full && <p className="mt-3 text-sm text-muted">{t('team.full')}</p>}

      {made && (
        <div role="status" className="mt-5 rounded-xl bg-surface px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Mail className="h-4 w-4" /> {t('team.sentTo', { email: made.email })}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-lg border border-border bg-white px-4 py-2.5 font-mono text-lg font-bold tracking-[0.18em] text-ink">{made.code}</span>
            <button type="button" onClick={copy} className={outline}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? t('team.copied') : t('team.copy')}
            </button>
          </div>
          <p className="mt-3 text-xs text-muted">{t('team.codeNote')}</p>
        </div>
      )}

      {team.invites.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{t('team.pendingTitle')}</p>
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {team.invites.map((invite) => (
              <li key={invite.id} className="flex items-center gap-3 px-3.5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{invite.email}</span>
                  <span className="block truncate text-xs text-muted">{t(roleKey(invite.role))} · {t('team.expires', { date: formatDate(new Date(invite.expiresAt), dateOptions) })}</span>
                </span>
                <button type="button" onClick={() => revoke(invite.id)} aria-label={t('team.revoke', { email: invite.email })} className="flex h-10 w-10 items-center justify-center rounded-xl text-muted outline-none transition hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Block>
  );
}

function JoinBlock() {
  const { t, tServer } = useTranslation();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const join = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      await joinWithCode(code.trim());
      window.location.assign('/dashboard');
    } catch (error) {
      notify.error(tServer(error));
      setBusy(false);
    }
  };

  return (
    <Block title={t('team.joinTitle')} hint={t('team.joinHint')}>
      <form onSubmit={join} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('team.codeLabel')}</span>
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="XXXXX-XXXXX" maxLength={12} autoComplete="off" spellCheck={false} className={`${field} font-mono tracking-[0.14em]`} />
        </label>
        <button type="submit" disabled={busy || !code.trim()} className={solid}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} {t('team.join')}
        </button>
      </form>
    </Block>
  );
}

export default function PeopleSection() {
  const { tServer } = useTranslation();
  const [team, setTeam] = useState(null);

  const load = useCallback(async () => {
    try {
      setTeam(await getTeam());
    } catch (error) {
      notify.error(tServer(error));
    }
  }, [tServer]);

  useEffect(() => {
    load();
  }, [load]);

  if (!team) {
    return (
      <div className="flex justify-center py-16 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const manage = team.me.role === 'owner' || team.me.role === 'admin';
  return (
    <div className="flex flex-col gap-5">
      <MembersBlock team={team} reload={load} />
      {manage && <InviteBlock team={team} reload={load} />}
      {team.members.length === 1 && <JoinBlock />}
    </div>
  );
}
