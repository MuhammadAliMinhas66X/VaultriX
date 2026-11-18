import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Check, ChevronDown, HandCoins, Pencil, Plus, Trash2, Undo2, Users, X } from 'lucide-react';
import Combobox from '../Combobox.jsx';
import MoneyInput from '../MoneyInput.jsx';
import { btn, card, inputClass } from '../salary/ui.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { notify } from '../../i18n/notifications.js';
import { useResource } from '../../data/useResource.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { CURRENCIES } from '../../utils/options.js';
import { localDay, roundDay } from '../../utils/committeeMath.js';
import { createCommittee, updateCommittee, removeCommittee, payRound, undoRound, markPayout, undoPayout } from '../../services/committeeService.js';

const NONE = [];
const pad = 'p-4 sm:p-5';
const dayDate = (day) => new Date(`${day}T00:00:00Z`);

function CommitteeForm({ committee, currency, onDone, onCancel }) {
  const { t, tServer } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const [name, setName] = useState(committee ? committee.name : '');
  const [code, setCode] = useState(committee ? committee.currency : currency);
  const [contribution, setContribution] = useState(committee ? String(committee.contribution) : '');
  const [size, setSize] = useState(committee ? String(committee.size) : '');
  const [mySlot, setMySlot] = useState(committee ? String(committee.mySlot) : '');
  const [frequency, setFrequency] = useState(committee ? committee.frequency : 'monthly');
  const [startDate, setStartDate] = useState(committee ? committee.startDate : localDay());
  const [busy, setBusy] = useState(false);
  const locked = Boolean(committee && (committee.paidCount > 0 || committee.payoutReceivedAt));
  const sizeNumber = Number(size);
  const slotNumber = Number(mySlot);
  const sizeOk = Number.isInteger(sizeNumber) && sizeNumber >= 2 && sizeNumber <= 60;
  const slotOk = sizeOk && Number.isInteger(slotNumber) && slotNumber >= 1 && slotNumber <= sizeNumber;
  const valid = name.trim() && Number(contribution) > 0 && sizeOk && slotOk && /^\d{4}-\d{2}-\d{2}$/.test(startDate);
  const currencyItems = CURRENCIES.map((item) => ({ value: item.value, label: item.value, sub: item.label }));
  const pot = valid ? formatMoney(Number(contribution) * sizeNumber, { currency: code, decimals: 0, maxDecimals: 2 }) : null;
  const myDay = valid ? roundDay(startDate, frequency, slotNumber) : null;

  const submit = async (event) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const payload = { name: name.trim(), currency: code, contribution: Number(contribution), size: sizeNumber, mySlot: slotNumber, frequency, startDate };
      if (committee) await updateCommittee(committee.id, payload);
      else await createCommittee(payload);
      notify.success(t('committees.saved'));
      onDone();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${card} ${pad} flex flex-col gap-4`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">{committee ? t('committees.edit') : t('committees.add')}</h2>
        <button type="button" aria-label={t('common.close')} onClick={onCancel} className={btn.icon}><X className="h-4 w-4" /></button>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">{t('committees.name')}</span>
        <input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder={t('committees.namePlaceholder')} className={inputClass(false)} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t('committees.contribution')}</span>
          <MoneyInput value={contribution} onChange={setContribution} disabled={locked} placeholder="0" aria-label={t('committees.contribution')} className={`${inputClass(false)} tabular-nums`} />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t('committees.currency')}</span>
          {locked ? <p className={`${inputClass(false)} flex items-center bg-surface text-muted`}>{code}</p> : <Combobox items={currencyItems} searchable ariaLabel={t('committees.currency')} value={code} onChange={setCode} />}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t('committees.members')}</span>
          <input inputMode="numeric" value={size} disabled={locked} onChange={(event) => setSize(event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="10" aria-invalid={size !== '' && !sizeOk ? 'true' : undefined} className={`${inputClass(size !== '' && !sizeOk)} tabular-nums`} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t('committees.mySlot')}</span>
          <input inputMode="numeric" value={mySlot} onChange={(event) => setMySlot(event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="3" aria-invalid={mySlot !== '' && !slotOk ? 'true' : undefined} className={`${inputClass(mySlot !== '' && !slotOk)} tabular-nums`} />
          {mySlot !== '' && !slotOk && <span role="alert" className="text-xs font-medium text-ink">{t('committees.errSlot')}</span>}
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t('committees.frequency')}</span>
          <div role="group" aria-label={t('committees.frequency')} className="grid h-11 grid-cols-2 gap-1 rounded-lg border border-border p-1 sm:h-10">
            {['monthly', 'weekly'].map((value) => (
              <button key={value} type="button" disabled={locked} aria-pressed={frequency === value} onClick={() => setFrequency(value)} className={`rounded-md text-sm font-medium transition disabled:cursor-not-allowed ${frequency === value ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>{t(`committees.${value}`)}</button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t('committees.startDate')}</span>
          <input type="date" value={startDate} disabled={locked} onChange={(event) => setStartDate(event.target.value)} className={inputClass(false)} />
        </label>
      </div>
      {locked && <p className="text-xs text-muted">{t('committees.locked')}</p>}
      {pot && <p className="rounded-lg bg-surface px-3.5 py-2.5 text-sm text-ink">{t('committees.preview', { pot, date: formatDate(dayDate(myDay), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) })}</p>}
      <button type="submit" disabled={busy || !valid} className={`${btn.primary} w-full sm:w-auto sm:self-end`}>{t('committees.save')}</button>
    </form>
  );
}

// One dot per round: filled = paid, ringed = overdue, soft = upcoming, bigger = your turn.
function RoundDots({ rounds, calm }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
      {rounds.map((item, index) => (
        <motion.span
          key={item.round}
          initial={calm ? false : { opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: calm ? 0 : Math.min(index * 0.02, 0.6), duration: 0.25 }}
          className={`rounded-full ${item.mine ? 'h-4 w-4 ring-2 ring-ink ring-offset-2' : 'h-3 w-3'} ${item.status === 'paid' ? 'bg-ink' : item.status === 'overdue' ? 'border-2 border-ink bg-white' : item.status === 'due' ? 'bg-[#64748b]' : 'border border-border bg-white'}`}
        />
      ))}
    </div>
  );
}

function StatusChip({ status }) {
  const { t } = useTranslation();
  const style = status === 'paid' ? 'bg-ink text-white' : status === 'overdue' ? 'border border-ink text-ink' : status === 'due' ? 'bg-surface text-ink' : 'text-muted';
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${style}`}>{t(`committees.status.${status}`)}</span>;
}

function CommitteeCard({ committee, canWrite, calm, onEdit }) {
  const { t, tServer } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const money = (value) => formatMoney(value, { currency: committee.currency, decimals: 0, maxDecimals: 2 });
  const shortDate = (day) => formatDate(dayDate(day), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const ratio = committee.total > 0 ? committee.paid / committee.total : 0;

  const run = async (action) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  const payoutLabel = committee.payoutStatus === 'received' ? t('committees.payoutReceived', { date: shortDate(committee.payoutReceivedAt) }) : committee.payoutStatus === 'ready' ? t('committees.payoutReady') : t('committees.payoutUpcoming');

  return (
    <li className={`${card} ${pad}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold text-ink">{committee.name}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{t('committees.membersCount', { count: committee.size })}</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap tabular-nums">{t(committee.frequency === 'weekly' ? 'committees.perWeek' : 'committees.perMonth', { amount: money(committee.contribution) })}</span>
          </p>
        </div>
        {committee.finished ? (
          <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-ink px-2.5 text-xs font-medium text-white"><Check className="h-3 w-3" />{t('committees.finished')}</span>
        ) : canWrite ? (
          <span className="flex shrink-0 items-center">
            <button type="button" aria-label={`${t('committees.edit')}: ${committee.name}`} onClick={() => onEdit(committee)} className={btn.icon}><Pencil className="h-4 w-4" /></button>
            <button type="button" aria-label={`${t('committees.delete')}: ${committee.name}`} aria-expanded={asking} onClick={() => setAsking((value) => !value)} className={btn.icon}><Trash2 className="h-4 w-4" /></button>
          </span>
        ) : null}
      </div>

      {asking && (
        <div role="group" aria-label={t('committees.deleteAsk')} className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3.5 py-2.5">
          <p className="text-sm font-medium text-ink">{t('committees.deleteAsk')}</p>
          <span className="flex gap-2">
            <button type="button" autoFocus onClick={() => setAsking(false)} className={btn.secondary}>{t('common.cancel')}</button>
            <button type="button" disabled={busy} onClick={() => run(() => removeCommittee(committee.id))} className={btn.danger}>{t('committees.delete')}</button>
          </span>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted">{t('committees.progress', { paid: committee.paidCount, total: committee.size })}</span>
          <span className="whitespace-nowrap font-semibold tabular-nums text-ink">{money(committee.paid)} <span className="font-normal text-muted">/ {money(committee.total)}</span></span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border/60" role="img" aria-label={t('committees.progress', { paid: committee.paidCount, total: committee.size })}>
          <motion.div initial={calm ? false : { width: 0 }} animate={{ width: `${ratio * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full bg-ink" />
        </div>
        <div className="mt-3"><RoundDots rounds={committee.rounds} calm={calm} /></div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3.5">
          <p className="text-xs font-medium text-muted">{t('committees.nextPayment')}</p>
          {committee.next ? (
            <>
              <p className="text-lg font-semibold tabular-nums text-ink">{money(committee.contribution)}</p>
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted">{t('committees.round', { n: committee.next.round })} · {shortDate(committee.next.due)} <StatusChip status={committee.next.status} /></p>
              {canWrite && <button type="button" disabled={busy} onClick={() => run(() => payRound(committee.id, committee.next.round, localDay()))} className={`${btn.secondary} self-start`}><Check className="h-4 w-4" />{t('committees.payNow')}</button>}
            </>
          ) : (
            <p className="text-sm font-medium text-ink">{t('committees.allPaid')}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3.5">
          <p className="text-xs font-medium text-muted">{t('committees.yourPayout')}</p>
          <p className="text-lg font-semibold tabular-nums text-ink">{money(committee.payout)}</p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">{t('committees.round', { n: committee.mySlot })} · {shortDate(committee.payoutDay)} <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${committee.payoutStatus === 'received' ? 'bg-ink text-white' : committee.payoutStatus === 'ready' ? 'border border-ink text-ink' : 'text-muted'}`}>{payoutLabel}</span></p>
          {canWrite && committee.payoutStatus === 'ready' && <button type="button" disabled={busy} onClick={() => run(() => markPayout(committee.id, localDay()))} className={`${btn.secondary} self-start`}><HandCoins className="h-4 w-4" />{t('committees.markReceived')}</button>}
          {canWrite && committee.payoutStatus === 'received' && <button type="button" disabled={busy} onClick={() => run(() => undoPayout(committee.id))} className={`${btn.ghost} -ms-3 self-start`}><Undo2 className="h-4 w-4" />{t('committees.undo')}</button>}
        </div>
      </div>

      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="mt-3 flex w-full items-center justify-between rounded-lg px-1 py-2 text-sm font-medium text-muted outline-none transition hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30">
        <span>{open ? t('committees.hideRounds') : t('committees.showRounds')} · {t('committees.endsOn', { date: shortDate(committee.endDay) })}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {committee.rounds.map((item) => (
            <li key={item.round} className="flex min-h-[52px] items-center gap-3 px-3.5 py-2">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-ink">{t('committees.round', { n: item.round })}{item.mine && <span className="inline-flex items-center gap-1 text-xs font-medium text-muted"><HandCoins className="h-3.5 w-3.5" />{t('committees.yourTurn')}</span>}</p>
                <p className="text-xs text-muted">{item.paidAt ? t('committees.paidOn', { date: shortDate(item.paidAt) }) : shortDate(item.due)}</p>
              </div>
              <StatusChip status={item.status} />
              {canWrite && (item.status === 'paid' ? (
                <button type="button" aria-label={`${t('committees.undo')}: ${t('committees.round', { n: item.round })}`} disabled={busy} onClick={() => run(() => undoRound(committee.id, item.round))} className={btn.icon}><Undo2 className="h-4 w-4" /></button>
              ) : (
                <button type="button" aria-label={`${t('committees.payNow')}: ${t('committees.round', { n: item.round })}`} disabled={busy} onClick={() => run(() => payRound(committee.id, item.round, localDay()))} className={btn.icon}><Check className="h-4 w-4" /></button>
              ))}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Committees({ canWrite }) {
  const { t } = useTranslation();
  const { currency } = useAuth();
  const calm = useAppReducedMotion();
  const today = localDay();
  const resource = useResource('committees', { today });
  const committees = resource.data ? resource.data.committees : NONE;
  const [form, setForm] = useState(null);
  const dueCount = committees.reduce((sum, item) => sum + item.rounds.filter((round) => round.status === 'overdue' || round.status === 'due').length, 0);

  if (form) return <CommitteeForm committee={form === 'new' ? null : form} currency={currency} onDone={() => setForm(null)} onCancel={() => setForm(null)} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {dueCount > 0 ? (
          <p role="status" className="flex items-center gap-2 text-sm font-medium text-ink"><AlertCircle className="h-4 w-4" />{t('committees.dueSummary', { count: dueCount })}</p>
        ) : <span />}
        {canWrite && <button type="button" onClick={() => setForm('new')} className={btn.primary}><Plus className="h-4 w-4" />{t('committees.add')}</button>}
      </div>
      {committees.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted"><Users className="h-5 w-5" strokeWidth={1.5} /></span>
          <p className="mt-4 text-base font-medium text-ink">{t('committees.emptyTitle')}</p>
          <p className="mt-1.5 max-w-md text-sm text-muted">{t('committees.emptyText')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {committees.map((item) => <CommitteeCard key={item.id} committee={item} canWrite={canWrite} calm={calm} onEdit={setForm} />)}
        </ul>
      )}
    </div>
  );
}
