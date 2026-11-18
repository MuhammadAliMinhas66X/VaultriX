import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, HandCoins, Pencil, Plus, Trash2, Undo2, Users, X } from 'lucide-react';
import Combobox from '../Combobox.jsx';
import { btn, card, inputClass } from '../salary/ui.js';
import { pad, dayDate, shortDateOptions, RoundDots, StatusChip, RoleChip, ProgressBar, Tile, PayoutChip } from './parts.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { notify } from '../../i18n/notifications.js';
import { localDay } from '../../utils/committeeMath.js';
import {
  removeCommittee,
  payRound,
  undoRound,
  markPayout,
  undoPayout,
  addMember,
  renameMember,
  removeMember,
  payForMember,
  undoMemberPayment,
  collectRound,
  setWinner,
  handOver,
  undoHandOver,
} from '../../services/committeeService.js';

// Runs one action, shows the server's message when it fails, and blocks double taps meanwhile.
function useAction() {
  const { tServer } = useTranslation();
  const [busy, setBusy] = useState(false);
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
  return [busy, run];
}

function Section({ title, hint, children }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// ---- Organizer matrix: one row per person, one column per round ----

function Cell({ state, label, disabled, onClick, winner }) {
  const look = state === 'paid' ? 'bg-ink text-white' : state === 'late' ? 'border-2 border-ink bg-white text-ink' : state === 'due' ? 'bg-surface text-ink ring-1 ring-border' : 'border border-border bg-white text-transparent';
  return (
    <button type="button" aria-label={label} aria-pressed={state === 'paid'} disabled={disabled} onClick={onClick} className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-default ${look} ${disabled ? '' : 'hover:border-ink/40'}`}>
      <Check className="h-4 w-4" strokeWidth={2.5} />
      {winner && <span aria-hidden="true" className="absolute -bottom-1 -end-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-ink" />}
    </button>
  );
}

function Matrix({ committee, today, canWrite }) {
  const { t } = useTranslation();
  const [busy, run] = useAction();
  const me = { id: 'me', name: t('committees.you'), paidRounds: committee.rounds.filter((item) => item.status === 'paid').map((item) => item.round), lateRounds: committee.rounds.filter((item) => item.status === 'overdue').map((item) => item.round), slot: committee.mySlot };
  const people = [me, ...committee.members];
  const stateOf = (person, round) => (person.paidRounds.includes(round.round) ? 'paid' : person.lateRounds.includes(round.round) ? 'late' : round.due === today ? 'due' : 'upcoming');

  const toggle = (person, round) => {
    const paid = person.paidRounds.includes(round.round);
    if (person.id === 'me') return run(() => (paid ? undoRound(committee.id, round.round) : payRound(committee.id, round.round, localDay())));
    return run(() => (paid ? undoMemberPayment(committee.id, person.id, round.round) : payForMember(committee.id, person.id, round.round, localDay())));
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full min-w-max border-collapse text-sm">
        <caption className="sr-only">{t('committees.matrixLabel')}</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="sticky start-0 z-10 min-w-[8.5rem] bg-white px-3.5 py-2.5 text-start text-xs font-medium text-muted">{t('committees.person')}</th>
            {committee.rounds.map((round) => (
              <th key={round.round} scope="col" className="px-1 py-2.5 text-center text-xs font-medium tabular-nums text-muted">{round.round}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {people.map((person) => (
            <tr key={person.id}>
              <th scope="row" className="sticky start-0 z-10 bg-white px-3.5 py-2 text-start font-medium text-ink">
                <span className="block max-w-[9rem] truncate">{person.name}</span>
                <span className="block text-xs font-normal text-muted">{person.slot ? t('committees.turn', { n: person.slot }) : t('committees.undrawn')}{person.lateRounds.length > 0 ? ` · ${t('committees.lateCount', { count: person.lateRounds.length })}` : ''}</span>
              </th>
              {committee.rounds.map((round) => {
                const state = stateOf(person, round);
                return (
                  <td key={round.round} className="px-1 py-1.5">
                    <Cell state={state} winner={person.slot === round.round} disabled={!canWrite || busy} label={`${person.name}: ${t('committees.round', { n: round.round })} ${t(state === 'paid' ? 'committees.status.paid' : state === 'late' ? 'committees.status.overdue' : state === 'due' ? 'committees.status.due' : 'committees.status.upcoming')}`} onClick={() => toggle(person, round)} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Names ----

function Names({ committee, canWrite }) {
  const { t } = useTranslation();
  const [busy, run] = useAction();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const room = committee.size - 1 - committee.members.length;

  const add = (event) => {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    run(async () => {
      await addMember(committee.id, value);
      setName('');
    });
  };
  const save = (member) => {
    const value = draft.trim();
    if (!value) return;
    run(async () => {
      await renameMember(committee.id, member.id, value);
      setEditing(null);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {committee.members.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
          {committee.members.map((member) => {
            const used = member.slot !== null || member.paidRounds.length > 0;
            return (
              <li key={member.id} className="flex min-h-[52px] items-center gap-3 px-3.5 py-2">
                {editing === member.id ? (
                  <form onSubmit={(event) => { event.preventDefault(); save(member); }} className="flex min-w-0 flex-1 items-center gap-2">
                    <input autoFocus value={draft} maxLength={40} onChange={(event) => setDraft(event.target.value)} aria-label={t('committees.personPlaceholder')} className={inputClass(false)} />
                    <button type="submit" disabled={busy || !draft.trim()} aria-label={t('committees.saveName')} className={btn.icon}><Check className="h-4 w-4" /></button>
                    <button type="button" aria-label={t('common.cancel')} onClick={() => setEditing(null)} className={btn.icon}><X className="h-4 w-4" /></button>
                  </form>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{member.name}</p>
                      <p className="text-xs text-muted">{member.slot ? t('committees.turn', { n: member.slot }) : t('committees.undrawn')}</p>
                    </div>
                    {canWrite && (
                      <span className="flex shrink-0 items-center">
                        <button type="button" aria-label={`${t('committees.rename')}: ${member.name}`} onClick={() => { setEditing(member.id); setDraft(member.name); }} className={btn.icon}><Pencil className="h-4 w-4" /></button>
                        <button type="button" disabled={busy || used} title={used ? t('committees.removeBlocked') : undefined} aria-label={`${t('committees.remove')}: ${member.name}`} onClick={() => run(() => removeMember(committee.id, member.id))} className={btn.icon}><Trash2 className="h-4 w-4" /></button>
                      </span>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canWrite && room > 0 && (
        <form onSubmit={add} className="flex items-center gap-2">
          <input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} placeholder={t('committees.personPlaceholder')} aria-label={t('committees.addPerson')} className={inputClass(false)} />
          <button type="submit" disabled={busy || !name.trim()} className={btn.secondaryMd}><Plus className="h-4 w-4" />{t('committees.addPerson')}</button>
        </form>
      )}
      {room > 0 && <p className="text-xs text-muted">{t('committees.missingNames', { count: room })}</p>}
    </div>
  );
}

// ---- Rounds ----

function RoundRow({ committee, round, today, canWrite }) {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const [busy, run] = useAction();
  const organizer = committee.role === 'organizer';
  const shortDate = (day) => formatDate(dayDate(day), shortDateOptions);
  const winnerValue = round.winner ? (round.winner.type === 'me' ? 'me' : round.winner.id) : 'none';
  const closed = Boolean(round.paidOutAt) || (round.mine && committee.payoutStatus === 'received');
  const items = [
    { value: 'none', label: t('committees.undrawn') },
    { value: 'me', label: t('committees.you') },
    ...committee.members.map((member) => ({ value: member.id, label: member.name })),
  ];
  const winnerName = round.winner ? (round.winner.type === 'me' ? t('committees.you') : round.winner.name) : t('committees.undrawn');
  const canHand = organizer && canWrite && round.winner && round.winner.type === 'member' && round.due <= today;

  return (
    <li className="flex flex-col gap-3 px-3.5 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${round.status === 'paid' ? 'bg-ink text-white' : 'bg-surface text-ink'} ${round.mine ? 'ring-2 ring-ink ring-offset-2' : ''}`}>{round.round}</span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-ink">{shortDate(round.due)} <StatusChip status={round.status} /></p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><HandCoins className="h-3.5 w-3.5" />{round.winner ? t('committees.takesPot', { name: winnerName }) : t('committees.undrawn')}</span>
            {organizer && <span className="whitespace-nowrap tabular-nums">{t('committees.collected', { paid: round.collected, total: committee.size })}</span>}
            {round.paidOutAt && <span className="whitespace-nowrap">{t('committees.handedOver', { date: shortDate(round.paidOutAt) })}</span>}
          </p>
        </div>
      </div>
      {canWrite && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {!closed && <Combobox items={items} searchable={false} ariaLabel={`${t('committees.setWinner')}: ${t('committees.round', { n: round.round })}`} value={winnerValue} onChange={(value) => run(() => setWinner(committee.id, round.round, value === 'none' ? null : value))} className="w-36" menuClassName="right-0 w-56" />}
          {organizer && !round.complete && <button type="button" disabled={busy} onClick={() => run(() => collectRound(committee.id, round.round, localDay()))} className={btn.secondary}><Users className="h-4 w-4" />{t('committees.markEveryone')}</button>}
          {canHand && !round.paidOutAt && <button type="button" disabled={busy} onClick={() => run(() => handOver(committee.id, round.round, localDay()))} className={btn.secondary}><HandCoins className="h-4 w-4" />{t('committees.handOver')}</button>}
          {canHand && round.paidOutAt && <button type="button" disabled={busy} aria-label={`${t('committees.undo')}: ${t('committees.handOver')}`} onClick={() => run(() => undoHandOver(committee.id, round.round))} className={btn.icon}><Undo2 className="h-4 w-4" /></button>}
          {round.status === 'paid' ? (
            <button type="button" disabled={busy} aria-label={`${t('committees.undo')}: ${t('committees.round', { n: round.round })}`} onClick={() => run(() => undoRound(committee.id, round.round))} className={btn.icon}><Undo2 className="h-4 w-4" /></button>
          ) : (
            <button type="button" disabled={busy} onClick={() => run(() => payRound(committee.id, round.round, localDay()))} className={btn.secondary}><Check className="h-4 w-4" />{t('committees.payNow')}</button>
          )}
        </div>
      )}
    </li>
  );
}

export default function CommitteeDetail({ committee, canWrite, calm, onEdit }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const navigate = useNavigate();
  const [busy, run] = useAction();
  const [asking, setAsking] = useState(false);
  const today = localDay();
  const organizer = committee.role === 'organizer';
  const money = (value) => formatMoney(value, { currency: committee.currency, decimals: 0, maxDecimals: 2 });
  const shortDate = (day) => formatDate(dayDate(day), shortDateOptions);
  const current = committee.rounds.find((item) => !item.complete) || committee.rounds[committee.rounds.length - 1];
  const nextPot = committee.rounds.find((item) => item.due <= today && item.winner && item.winner.type === 'member' && !item.paidOutAt);
  const payoutLabel = { received: t('committees.payoutReceived', { date: committee.payoutReceivedAt ? shortDate(committee.payoutReceivedAt) : '' }), ready: t('committees.payoutReady'), upcoming: t('committees.payoutUpcoming'), undrawn: t('committees.payoutUndrawn') }[committee.payoutStatus];

  return (
    <div className="flex flex-col gap-7">
      <div className={`${card} ${pad}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-xl font-semibold tracking-tight text-ink">{committee.name}</h1>
              <RoleChip role={committee.role} />
              {committee.finished && <span className="inline-flex h-6 items-center gap-1 rounded-full bg-ink px-2.5 text-xs font-medium text-white"><Check className="h-3 w-3" />{t('committees.finished')}</span>}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <span>{t('committees.membersCount', { count: committee.size })}</span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap tabular-nums">{t(committee.frequency === 'weekly' ? 'committees.perWeek' : 'committees.perMonth', { amount: money(committee.contribution) })}</span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap tabular-nums">{t('committees.potIs', { amount: money(committee.payout) })}</span>
              <span aria-hidden="true">·</span>
              <span>{t('committees.endsOn', { date: shortDate(committee.endDay) })}</span>
            </p>
          </div>
          {canWrite && (
            <span className="flex shrink-0 items-center">
              <button type="button" aria-label={`${t('committees.edit')}: ${committee.name}`} onClick={() => onEdit(committee)} className={btn.icon}><Pencil className="h-4 w-4" /></button>
              <button type="button" aria-label={`${t('committees.delete')}: ${committee.name}`} aria-expanded={asking} onClick={() => setAsking((value) => !value)} className={btn.icon}><Trash2 className="h-4 w-4" /></button>
            </span>
          )}
        </div>
        {asking && (
          <div role="group" aria-label={t('committees.deleteAsk')} className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3.5 py-2.5">
            <p className="text-sm font-medium text-ink">{t('committees.deleteAsk')}</p>
            <span className="flex gap-2">
              <button type="button" autoFocus onClick={() => setAsking(false)} className={btn.secondary}>{t('common.cancel')}</button>
              <button type="button" disabled={busy} onClick={() => run(async () => { await removeCommittee(committee.id); navigate('/committees', { replace: true }); })} className={btn.danger}>{t('committees.delete')}</button>
            </span>
          </div>
        )}
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted">{t('committees.progress', { paid: committee.paidCount, total: committee.size })}</span>
            <span className="whitespace-nowrap font-semibold tabular-nums text-ink">{money(committee.paid)} <span className="font-normal text-muted">/ {money(committee.total)}</span></span>
          </div>
          <div className="mt-2"><ProgressBar ratio={committee.total > 0 ? committee.paid / committee.total : 0} calm={calm} label={t('committees.progress', { paid: committee.paidCount, total: committee.size })} /></div>
          <div className="mt-3"><RoundDots rounds={committee.rounds} calm={calm} /></div>
        </div>
      </div>

      <Section title={organizer ? t('committees.yourSide') : t('committees.overview')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Tile label={t('committees.nextPayment')}>
            {committee.next ? (
              <>
                <p className="text-lg font-semibold tabular-nums text-ink">{money(committee.contribution)}</p>
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted">{t('committees.round', { n: committee.next.round })} · {shortDate(committee.next.due)} <StatusChip status={committee.next.status} /></p>
                {canWrite && <button type="button" disabled={busy} onClick={() => run(() => payRound(committee.id, committee.next.round, today))} className={`${btn.secondary} self-start`}><Check className="h-4 w-4" />{t('committees.payNow')}</button>}
              </>
            ) : (
              <p className="text-sm font-medium text-ink">{t('committees.allPaid')}</p>
            )}
          </Tile>
          <Tile label={t('committees.yourPayout')}>
            <p className="text-lg font-semibold tabular-nums text-ink">{money(committee.payout)}</p>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted">{committee.mySlot ? <>{t('committees.round', { n: committee.mySlot })} · {shortDate(committee.payoutDay)}</> : null} <PayoutChip status={committee.payoutStatus} label={payoutLabel} /></p>
            {canWrite && committee.payoutStatus === 'ready' && <button type="button" disabled={busy} onClick={() => run(() => markPayout(committee.id, today))} className={`${btn.secondary} self-start`}><HandCoins className="h-4 w-4" />{t('committees.markReceived')}</button>}
            {canWrite && committee.payoutStatus === 'received' && <button type="button" disabled={busy} onClick={() => run(() => undoPayout(committee.id))} className={`${btn.ghost} -ms-3 self-start`}><Undo2 className="h-4 w-4" />{t('committees.undo')}</button>}
          </Tile>
        </div>
      </Section>

      {organizer && (
        <Section title={t('committees.asOrganizer')} hint={t('committees.asOrganizerHint')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile label={t('committees.owedToYou')}>
              <p className="text-lg font-semibold tabular-nums text-ink">{money(committee.owed)}</p>
              <p className="text-sm text-muted">{committee.lateMembers > 0 ? t('committees.lateCount', { count: committee.lateMembers }) : t('committees.nobodyLate')}</p>
            </Tile>
            <Tile label={t('committees.thisRound')}>
              <p className="text-lg font-semibold tabular-nums text-ink">{t('committees.collected', { paid: current.collected, total: committee.size })}</p>
              <p className="text-sm text-muted">{t('committees.round', { n: current.round })} · {shortDate(current.due)}</p>
              {canWrite && !current.complete && <button type="button" disabled={busy} onClick={() => run(() => collectRound(committee.id, current.round, today))} className={`${btn.secondary} self-start`}><Users className="h-4 w-4" />{t('committees.markEveryone')}</button>}
            </Tile>
            <Tile label={t('committees.potsTitle')}>
              <p className="text-lg font-semibold tabular-nums text-ink">{committee.potsToHandOver}</p>
              <p className="text-sm text-muted">{nextPot ? t('committees.potNext', { name: nextPot.winner.name, round: nextPot.round }) : t('committees.potsNone')}</p>
              {canWrite && nextPot && <button type="button" disabled={busy} onClick={() => run(() => handOver(committee.id, nextPot.round, today))} className={`${btn.secondary} self-start`}><HandCoins className="h-4 w-4" />{t('committees.handOver')}</button>}
            </Tile>
          </div>
        </Section>
      )}

      {organizer && (
        <Section title={t('committees.matrixTitle')} hint={t('committees.matrixHint')}>
          <Matrix committee={committee} today={today} canWrite={canWrite} />
        </Section>
      )}

      <Section title={t('committees.rounds')} hint={t('committees.roundsHint')}>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
          {committee.rounds.map((round) => <RoundRow key={round.round} committee={committee} round={round} today={today} canWrite={canWrite} />)}
        </ul>
      </Section>

      <Section title={t('committees.people')} hint={organizer ? t('committees.peopleHintOrganizer') : t('committees.peopleHintMember')}>
        <Names committee={committee} canWrite={canWrite} />
      </Section>
    </div>
  );
}
