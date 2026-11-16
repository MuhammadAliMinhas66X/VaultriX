import { useState } from 'react';
import Combobox from '../Combobox.jsx';
import MoneyInput from '../MoneyInput.jsx';
import FormField from '../FormField.jsx';
import Button from '../Button.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { todayLocal } from '../loans/loanOptions.js';

const field = 'w-full rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';

// Records "X paid Y": a real payment between two people that clears part of what is owed.
export default function SettleSheet({ members, me, initial, busy, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const people = members.filter((member) => !member.left);
  const [from, setFrom] = useState(initial.fromUserId);
  const [to, setTo] = useState(initial.toUserId);
  const [amount, setAmount] = useState(initial.amount ? String(initial.amount) : '');
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const items = people.map((member) => ({ value: member.id, label: member.id === me ? `${member.name} (${t('groups.you')})` : member.name }));

  const submit = (event) => {
    event.preventDefault();
    if (!from || !to || from === to || !(Number(amount) > 0) || !date || date > todayLocal()) return setError(t('groups.errCheck'));
    return onSubmit({ fromUserId: from, toUserId: to, amount: Number(amount), currency: initial.currency, paidAt: date, note: note.trim() });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('groups.settleFrom')}</span>
          <Combobox items={items} searchable={false} ariaLabel={t('groups.settleFrom')} value={from} onChange={setFrom} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('groups.settleTo')}</span>
          <Combobox items={items} searchable={false} ariaLabel={t('groups.settleTo')} value={to} onChange={setTo} />
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('groups.settleAmount')}</span>
          <MoneyInput value={amount} onChange={setAmount} placeholder="0" autoFocus className={`${field} tabular-nums`} />
        </label>
        <span className="pb-2.5 text-sm font-semibold text-muted">{initial.currency}</span>
      </div>
      <FormField label={t('groups.formDate')} type="date" max={todayLocal()} value={date} onChange={(event) => setDate(event.target.value)} />
      <FormField label={t('groups.settleNote')} value={note} maxLength={120} onChange={(event) => setNote(event.target.value)} />
      {error && <p role="alert" className="rounded-xl bg-surface px-4 py-3 text-sm text-ink">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">
          {t('common.cancel')}
        </button>
        <div className="sm:w-44">
          <Button type="submit" loading={busy} loadingLabel={t('common.saving')}>
            {t('groups.settleSave')}
          </Button>
        </div>
      </div>
    </form>
  );
}
