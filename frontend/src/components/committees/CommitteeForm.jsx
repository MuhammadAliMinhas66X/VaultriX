import { useState } from 'react';
import { HandCoins, Users, X } from 'lucide-react';
import Combobox from '../Combobox.jsx';
import MoneyInput from '../MoneyInput.jsx';
import { btn, card, inputClass } from '../salary/ui.js';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { notify } from '../../i18n/notifications.js';
import { CURRENCIES } from '../../utils/options.js';
import { localDay, roundDay } from '../../utils/committeeMath.js';
import { createCommittee, updateCommittee } from '../../services/committeeService.js';

const dayDate = (day) => new Date(`${day}T00:00:00Z`);

function Segmented({ label, value, onChange, options, disabled }) {
  return (
    <div role="group" aria-label={label} className="grid h-11 gap-1 rounded-lg border border-border p-1 sm:h-10" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button key={option.value} type="button" disabled={disabled} aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`rounded-md text-sm font-medium transition disabled:cursor-not-allowed ${value === option.value ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Create or change a committee. `committee` is null for a new one.
export default function CommitteeForm({ committee, currency, onDone, onCancel }) {
  const { t, tServer } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const [role, setRole] = useState(committee ? committee.role : 'member');
  const [name, setName] = useState(committee ? committee.name : '');
  const [code, setCode] = useState(committee ? committee.currency : currency);
  const [contribution, setContribution] = useState(committee ? String(committee.contribution) : '');
  const [size, setSize] = useState(committee ? String(committee.size) : '');
  const [mySlot, setMySlot] = useState(committee && committee.mySlot ? String(committee.mySlot) : '');
  const [notDrawn, setNotDrawn] = useState(committee ? committee.mySlot === null : false);
  const [frequency, setFrequency] = useState(committee ? committee.frequency : 'monthly');
  const [startDate, setStartDate] = useState(committee ? committee.startDate : localDay());
  const [names, setNames] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = Boolean(committee && (committee.paidCount > 0 || committee.payoutReceivedAt || committee.members.some((member) => member.paidRounds.length > 0) || committee.rounds.some((round) => round.paidOutAt)));
  const sizeNumber = Number(size);
  const slotNumber = Number(mySlot);
  const sizeOk = Number.isInteger(sizeNumber) && sizeNumber >= 2 && sizeNumber <= 60;
  const slotOk = notDrawn || (sizeOk && Number.isInteger(slotNumber) && slotNumber >= 1 && slotNumber <= sizeNumber);
  const nameList = names.split('\n').map((line) => line.trim()).filter(Boolean);
  const namesOk = !committee && sizeOk ? nameList.length <= sizeNumber - 1 : true;
  const valid = name.trim() && Number(contribution) > 0 && sizeOk && slotOk && namesOk && /^\d{4}-\d{2}-\d{2}$/.test(startDate);
  const currencyItems = CURRENCIES.map((item) => ({ value: item.value, label: item.value, sub: item.label }));
  const pot = valid ? formatMoney(Number(contribution) * sizeNumber, { currency: code, decimals: 0, maxDecimals: 2 }) : null;
  const myDay = valid && !notDrawn ? roundDay(startDate, frequency, slotNumber) : null;

  const submit = async (event) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const payload = { name: name.trim(), role, currency: code, contribution: Number(contribution), size: sizeNumber, mySlot: notDrawn ? null : slotNumber, frequency, startDate };
      if (committee) await updateCommittee(committee.id, payload);
      else await createCommittee({ ...payload, memberNames: role === 'organizer' ? nameList : undefined });
      notify.success(t('committees.saved'));
      onDone();
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${card} flex flex-col gap-5 p-4 sm:p-5`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">{committee ? t('committees.edit') : t('committees.add')}</h2>
        <button type="button" aria-label={t('common.close')} onClick={onCancel} className={btn.icon}><X className="h-4 w-4" /></button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">{t('committees.roleLabel')}</span>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { value: 'member', icon: Users, title: t('committees.roleMember'), text: t('committees.roleMemberHint') },
            { value: 'organizer', icon: HandCoins, title: t('committees.roleOrganizer'), text: t('committees.roleOrganizerHint') },
          ].map((option) => (
            <button key={option.value} type="button" aria-pressed={role === option.value} onClick={() => setRole(option.value)} className={`flex items-start gap-3 rounded-xl border p-3.5 text-start outline-none transition focus-visible:ring-2 focus-visible:ring-accent/30 ${role === option.value ? 'border-ink bg-surface' : 'border-border hover:border-ink/30'}`}>
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${role === option.value ? 'bg-ink text-white' : 'bg-surface text-muted'}`}><option.icon className="h-4 w-4" strokeWidth={1.75} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{option.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{option.text}</span>
              </span>
            </button>
          ))}
        </div>
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
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t('committees.frequency')}</span>
          <Segmented label={t('committees.frequency')} value={frequency} onChange={setFrequency} disabled={locked} options={[{ value: 'monthly', label: t('committees.monthly') }, { value: 'weekly', label: t('committees.weekly') }]} />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t('committees.startDate')}</span>
          <input type="date" value={startDate} disabled={locked} onChange={(event) => setStartDate(event.target.value)} className={inputClass(false)} />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t('committees.mySlot')}</span>
          <input inputMode="numeric" value={notDrawn ? '' : mySlot} disabled={notDrawn} onChange={(event) => setMySlot(event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder={notDrawn ? t('committees.notDrawn') : '3'} aria-invalid={!slotOk ? 'true' : undefined} className={`${inputClass(!slotOk)} tabular-nums`} />
          <label className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={notDrawn} onChange={(event) => setNotDrawn(event.target.checked)} className="h-4 w-4 rounded border-border accent-[#111114]" />
            {t('committees.notDrawnHint')}
          </label>
          {!slotOk && <span role="alert" className="text-xs font-medium text-ink">{t('committees.errSlot')}</span>}
        </div>
      </div>

      {role === 'organizer' && !committee && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t('committees.namesLabel')}</span>
          <textarea rows={4} value={names} onChange={(event) => setNames(event.target.value)} placeholder={t('committees.namesPlaceholder')} aria-invalid={!namesOk ? 'true' : undefined} className={`${inputClass(!namesOk)} h-auto min-h-[6.5rem] py-2.5 leading-6`} />
          <span className="text-xs text-muted">{namesOk ? t('committees.namesHint', { count: sizeOk ? sizeNumber - 1 : 0 }) : t('committees.errNames', { count: sizeNumber - 1 })}</span>
        </label>
      )}

      {locked && <p className="text-xs text-muted">{t('committees.locked')}</p>}
      {pot && <p className="rounded-lg bg-surface px-3.5 py-2.5 text-sm text-ink">{myDay ? t('committees.preview', { pot, date: formatDate(dayDate(myDay), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) }) : t('committees.previewNoTurn', { pot })}</p>}
      <button type="submit" disabled={busy || !valid} className={`${btn.primary} w-full sm:w-auto sm:self-end`}>{t('committees.save')}</button>
    </form>
  );
}
