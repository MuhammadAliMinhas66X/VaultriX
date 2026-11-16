import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Copy, Loader2, Mail, Plus, Trash2, Wallet, X, Pencil } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import Drawer from '../components/Drawer.jsx';
import GroupExpenseSheet from '../components/groups/GroupExpenseSheet.jsx';
import SettleSheet from '../components/groups/SettleSheet.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { notify } from '../i18n/notifications.js';
import { dateOptions } from '../utils/dates.js';
import * as api from '../services/groupService.js';

const card = 'rounded-2xl border border-border bg-white';
const outline = 'flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition hover:border-ink/30 hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50';
const field = 'w-full rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';
const initialsOf = (name) => (String(name || '?').trim()[0] || '?').toUpperCase();

export default function GroupPage() {
  const { id } = useParams();
  const { t, tServer } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const { currencies } = useLocalizedOptions();
  const { currency: myCurrency } = useAuth();
  const { items, activeId } = useAppNav();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const [sheet, setSheet] = useState(null); // { type: 'expense', expense? } | { type: 'settle', initial }
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [made, setMade] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.getGroup(id));
    } catch (error) {
      setMissing(true);
      notify.error(tServer(error));
    }
  }, [id, tServer]);

  useEffect(() => {
    load();
  }, [load]);

  const names = useMemo(() => new Map((data ? data.members : []).map((member) => [member.id, member.name])), [data]);
  const nameOf = (userId) => (userId === (data && data.me) ? t('groups.you') : names.get(userId) || '?');
  const money = (amount, currency) => formatMoney(amount, { decimals: 2, currency });

  const act = async (job, after) => {
    setBusy(true);
    try {
      await job();
      if (after) after();
      await load();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
      setConfirm('');
    }
  };

  if (missing) {
    return (
      <AppShell showLogo pageTitle={t('groups.title')} items={items} activeId={activeId}>
        <div className="mx-auto max-w-[880px] px-4 py-16 text-center">
          <p className="text-sm text-muted">{t('groups.cantLoad')}</p>
          <Link to="/groups" className="mt-4 inline-block text-sm font-semibold text-ink underline underline-offset-4">{t('groups.back')}</Link>
        </div>
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell showLogo pageTitle={t('groups.title')} items={items} activeId={activeId}>
        <div className="flex justify-center py-24 text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
      </AppShell>
    );
  }

  const { group, me, members, expenses, settlements, invites, balances } = data;
  const active = members.filter((member) => !member.left);
  const myRows = balances.map((entry) => ({ currency: entry.currency, amount: (entry.balances.find((row) => row.userId === me) || { amount: 0 }).amount })).filter((row) => row.amount !== 0);
  const transfers = balances.flatMap((entry) => entry.transfers.map((transfer) => ({ ...transfer, currency: entry.currency })));

  const sendInvite = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const out = await api.inviteToGroup(id, email.trim());
      setMade({ code: out.code, email: email.trim() });
      setEmail('');
      await load();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setInviting(false);
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

  const closeSheet = () => setSheet(null);

  return (
    <AppShell showLogo pageTitle={group.name} items={items} activeId={activeId}>
      <div className="mx-auto w-full max-w-[880px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link to="/groups" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {t('groups.back')}
        </Link>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-ink">{group.name}</h1>
          <button type="button" onClick={() => setSheet({ type: 'expense' })} className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
            <Plus className="h-4 w-4" /> {t('groups.addExpense')}
          </button>
        </div>

        <ul className="mb-5 flex flex-wrap gap-2">
          {active.map((member) => (
            <li key={member.id} className="flex items-center gap-2 rounded-full bg-white py-1 pe-3 ps-1 text-sm font-medium text-ink ring-1 ring-border">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-xs font-semibold">{initialsOf(member.name)}</span>
              {member.id === me ? `${member.name} (${t('groups.you')})` : member.name}
            </li>
          ))}
        </ul>

        <section className="rounded-2xl bg-ink p-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{t('groups.yourBalance')}</p>
          {myRows.length === 0 ? (
            <p className="mt-2 flex items-center gap-2 text-lg font-semibold"><Check className="h-5 w-5" /> {t('groups.allSettled')}</p>
          ) : (
            <div className="mt-2 flex flex-col gap-1.5">
              {myRows.map((row) => (
                <p key={row.currency} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm text-white/70">{row.amount > 0 ? t('groups.youAreOwed') : t('groups.youOwe')}</span>
                  <span className="whitespace-nowrap text-2xl font-bold tabular-nums">{money(Math.abs(row.amount), row.currency)}</span>
                </p>
              ))}
            </div>
          )}
        </section>

        <section className={`${card} mt-5`}>
          <h2 className="border-b border-border px-5 py-3.5 text-sm font-semibold text-ink">{t('groups.whoOwes')}</h2>
          {transfers.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">{t('groups.nobodyOwes')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {transfers.map((transfer) => (
                <li key={`${transfer.currency}-${transfer.fromUserId}-${transfer.toUserId}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-ink">
                    <span className="truncate">{nameOf(transfer.fromUserId)}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                    <span className="truncate">{nameOf(transfer.toUserId)}</span>
                  </span>
                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{money(transfer.amount, transfer.currency)}</span>
                  <button type="button" onClick={() => setSheet({ type: 'settle', initial: { fromUserId: transfer.fromUserId, toUserId: transfer.toUserId, amount: transfer.amount, currency: transfer.currency } })} className={outline}>
                    {t('groups.settleUp')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} mt-5`}>
          <h2 className="border-b border-border px-5 py-3.5 text-sm font-semibold text-ink">{t('groups.expensesTitle')}</h2>
          {expenses.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">{t('groups.noExpenses')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {expenses.map((expense) => {
                const share = expense.shares.find((item) => item.userId === me);
                const canEdit = expense.createdBy === me || group.isCreator;
                return (
                  <li key={expense.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-ink">{expense.description}</p>
                        <p className="mt-0.5 text-sm text-muted">
                          {t('groups.paidBy', { name: nameOf(expense.paidBy) })} · {t('groups.splitWays', { count: expense.shares.length })} · {formatDate(new Date(expense.spentAt), { ...dateOptions, timeZone: 'UTC' })}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="whitespace-nowrap text-[15px] font-bold tabular-nums text-ink">{money(expense.amount, expense.currency)}</p>
                        <p className="whitespace-nowrap text-xs tabular-nums text-muted">{share ? t('groups.yourShare', { amount: money(share.amount, expense.currency) }) : t('groups.notInvolved')}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {share && (expense.inMyExpenses ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-ink"><Check className="h-3.5 w-3.5" /> {t('groups.inMyExpenses')}</span>
                      ) : (
                        <button type="button" disabled={busy} onClick={() => act(() => api.shareToMyExpenses(id, expense.id), () => notify.success(t('groups.addedToMine')))} className={`${outline} !px-3 !py-1.5 text-xs`}>
                          <Wallet className="h-3.5 w-3.5" /> {t('groups.toMyExpenses')}
                        </button>
                      ))}
                      {canEdit && (
                        <>
                          <button type="button" onClick={() => setSheet({ type: 'expense', expense })} aria-label={t('groups.edit')} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40">
                            <Pencil className="h-4 w-4" />
                          </button>
                          {confirm === expense.id ? (
                            <button type="button" disabled={busy} onClick={() => act(() => api.deleteGroupExpense(id, expense.id))} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700">
                              {t('groups.confirmDelete')}
                            </button>
                          ) : (
                            <button type="button" onClick={() => setConfirm(expense.id)} aria-label={t('groups.delete')} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-accent/40">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {settlements.length > 0 && (
          <section className={`${card} mt-5`}>
            <h2 className="border-b border-border px-5 py-3.5 text-sm font-semibold text-ink">{t('groups.paymentsTitle')}</h2>
            <ul className="divide-y divide-border">
              {settlements.map((payment) => (
                <li key={payment.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{t('groups.paidTo', { from: nameOf(payment.fromUserId), to: nameOf(payment.toUserId) })}</p>
                    <p className="truncate text-xs text-muted">{formatDate(new Date(payment.paidAt), { ...dateOptions, timeZone: 'UTC' })}{payment.note ? ` · ${payment.note}` : ''}</p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{money(payment.amount, payment.currency)}</span>
                  {(payment.createdBy === me || group.isCreator) && (
                    <button type="button" disabled={busy} onClick={() => act(() => api.deleteSettlement(id, payment.id))} aria-label={t('groups.delete')} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-accent/40">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={`${card} mt-5 p-5`}>
          <h2 className="text-sm font-semibold text-ink">{t('groups.inviteTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('groups.inviteHint')}</p>
          <form onSubmit={sendInvite} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">{t('groups.emailLabel')}</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('team.emailPlaceholder')} maxLength={160} className={field} />
            </label>
            <button type="submit" disabled={inviting || !email.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} {t('groups.sendInvite')}
            </button>
          </form>
          {made && (
            <div role="status" className="mt-4 rounded-xl bg-surface px-4 py-4">
              <p className="text-sm font-semibold text-ink">{t('groups.sentTo', { email: made.email })}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="rounded-lg border border-border bg-white px-4 py-2.5 font-mono text-lg font-bold tracking-[0.18em] text-ink">{made.code}</span>
                <button type="button" onClick={copy} className={outline}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? t('groups.copied') : t('groups.copy')}</button>
              </div>
              <p className="mt-3 text-xs text-muted">{t('groups.codeNote')}</p>
            </div>
          )}
          {invites.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{t('groups.pending')}</p>
              <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
                {invites.map((invite) => (
                  <li key={invite.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{invite.email}</span>
                    <button type="button" onClick={() => act(() => api.revokeGroupInvite(id, invite.id))} aria-label={t('team.revoke', { email: invite.email })} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="mt-6 flex flex-wrap gap-2">
          {confirm === 'leave' ? (
            <>
              <span className="self-center text-sm text-ink">{t('groups.leaveAsk')}</span>
              <button type="button" onClick={() => setConfirm('')} className={outline}>{t('common.cancel')}</button>
              <button type="button" disabled={busy} onClick={() => act(() => api.leaveGroup(id), () => navigate('/groups'))} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700">{t('groups.leave')}</button>
            </>
          ) : confirm === 'delete' ? (
            <>
              <span className="self-center text-sm text-ink">{t('groups.deleteGroupAsk')}</span>
              <button type="button" onClick={() => setConfirm('')} className={outline}>{t('common.cancel')}</button>
              <button type="button" disabled={busy} onClick={() => act(() => api.deleteGroup(id), () => navigate('/groups'))} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700">{t('groups.deleteGroup')}</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setConfirm('leave')} className={outline}>{t('groups.leave')}</button>
              {group.isCreator && <button type="button" onClick={() => setConfirm('delete')} className={`${outline} text-red-600`}>{t('groups.deleteGroup')}</button>}
            </>
          )}
        </div>
      </div>

      <Drawer open={Boolean(sheet)} onClose={closeSheet} title={sheet && sheet.type === 'settle' ? t('groups.settleTitle') : sheet && sheet.expense ? t('groups.edit') : t('groups.addExpense')} label={t('groups.addExpense')}>
        {sheet && sheet.type === 'expense' && (
          <GroupExpenseSheet
            key={sheet.expense ? sheet.expense.id : 'new'}
            members={members}
            me={me}
            currencies={currencies}
            defaultCurrency={group.currency || myCurrency}
            initial={sheet.expense || null}
            busy={busy}
            onCancel={closeSheet}
            onSubmit={(payload) => act(() => (sheet.expense ? api.updateGroupExpense(id, sheet.expense.id, payload) : api.addGroupExpense(id, payload)), closeSheet)}
          />
        )}
        {sheet && sheet.type === 'settle' && (
          <SettleSheet members={members} me={me} initial={sheet.initial} busy={busy} onCancel={closeSheet} onSubmit={(payload) => act(() => api.addSettlement(id, payload), closeSheet)} />
        )}
      </Drawer>
    </AppShell>
  );
}
