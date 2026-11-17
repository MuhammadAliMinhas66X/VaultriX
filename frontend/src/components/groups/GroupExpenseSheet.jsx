import { useMemo, useState } from 'react';
import Combobox from '../Combobox.jsx';
import MoneyInput from '../MoneyInput.jsx';
import FormField from '../FormField.jsx';
import Button from '../Button.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { splitEqualMinor, splitPercentMinor, percentLeft, leftToAssign, toMinor, fromMinor } from '../../utils/groupSplit.js';
import { todayLocal } from '../loans/loanOptions.js';

const field = 'w-full rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';

const initialsOf = (name) => (String(name || '?').trim()[0] || '?').toUpperCase();

// Add or edit one shared cost. `members` are the people still in the group.
export default function GroupExpenseSheet({ members, me, currencies, defaultCurrency, initial, busy, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();
  const people = useMemo(() => members.filter((member) => !member.left), [members]);

  const [description, setDescription] = useState(initial ? initial.description : '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [currency, setCurrency] = useState(initial ? initial.currency : defaultCurrency);
  const [date, setDate] = useState(initial ? String(initial.spentAt).slice(0, 10) : todayLocal());
  const [paidBy, setPaidBy] = useState(initial ? initial.paidBy : me);
  const [mode, setMode] = useState(initial ? initial.splitType : 'equal');
  const [included, setIncluded] = useState(() => new Set(initial ? initial.shares.map((share) => share.userId) : people.map((member) => member.id)));
  const [parts, setParts] = useState(() => Object.fromEntries((initial && initial.splitType === 'exact' ? initial.shares : []).map((share) => [share.userId, String(share.amount)])));
  const [percents, setPercents] = useState(() => Object.fromEntries((initial && initial.splitType === 'percent' ? initial.shares : []).map((share) => [share.userId, String(share.percent ?? '')])));
  const [repeat, setRepeat] = useState(initial ? initial.repeat || 'none' : 'none');
  const [error, setError] = useState('');

  const total = toMinor(amount);
  const ids = people.filter((member) => included.has(member.id)).map((member) => member.id);
  const equal = splitEqualMinor(total, ids);
  const left = leftToAssign(amount, parts);
  const pctLeft = percentLeft(percents);
  const pctMinor = splitPercentMinor(total, percents);

  const toggle = (id) =>
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = (event) => {
    event.preventDefault();
    const base = { description: description.trim(), amount: Number(amount), currency, spentAt: date, paidBy, splitType: mode, ...(initial && initial.repeatOf ? {} : { repeat }) };
    if (!base.description || !(base.amount > 0) || !currency || !date || date > todayLocal()) return setError(t('groups.errCheck'));
    if (mode === 'equal') {
      if (ids.length === 0) return setError(t('groups.errCheck'));
      return onSubmit({ ...base, participants: ids });
    }
    if (mode === 'percent') {
      const list = people.map((member) => ({ userId: member.id, percent: Number(percents[member.id] || 0) })).filter((row) => row.percent > 0);
      if (list.length === 0 || pctLeft !== 0) return setError(t('groups.errCheck'));
      return onSubmit({ ...base, percents: list });
    }
    const shares = people.map((member) => ({ userId: member.id, amount: Number(parts[member.id] || 0) })).filter((share) => share.amount > 0);
    if (shares.length === 0 || left !== 0) return setError(t('groups.errCheck'));
    return onSubmit({ ...base, shares });
  };

  const repeatItems = ['none', 'weekly', 'monthly', 'yearly'].map((value) => ({ value, label: t(`expenses.repeat${value[0].toUpperCase()}${value.slice(1)}`) }));

  const payerItems = people.map((member) => ({
    value: member.id,
    label: member.id === me ? `${member.name} (${t('groups.you')})` : member.name,
    icon: <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-ink">{initialsOf(member.name)}</span>,
  }));

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <FormField label={t('groups.formDescription')} value={description} maxLength={80} autoFocus onChange={(event) => setDescription(event.target.value)} placeholder={t('groups.formDescriptionPlaceholder')} />

      <div className="grid grid-cols-[minmax(0,1fr)_9rem] gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('groups.formAmount')}</span>
          <MoneyInput value={amount} onChange={setAmount} placeholder="0" className={`${field} tabular-nums`} />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('income.currencyLabel')}</span>
          <Combobox items={currencies} ariaLabel={t('income.currencyLabel')} value={currency} onChange={setCurrency} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={t('groups.formDate')} type="date" max={todayLocal()} value={date} onChange={(event) => setDate(event.target.value)} />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('groups.formPaidBy')}</span>
          <Combobox items={payerItems} searchable={people.length > 6} ariaLabel={t('groups.formPaidBy')} value={paidBy} onChange={setPaidBy} />
        </div>
      </div>

      {!(initial && initial.repeatOf) ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t('expenses.repeatLabel')}</span>
          <Combobox items={repeatItems} searchable={false} ariaLabel={t('expenses.repeatLabel')} value={repeat} onChange={setRepeat} />
          {repeat !== 'none' && <p className="text-xs text-muted">{t('groups.repeatHint')}</p>}
        </div>
      ) : (
        <p className="text-xs text-muted">{t('groups.repeatCopy')}</p>
      )}

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-ink">{t('groups.formSplit')}</span>
        <div role="radiogroup" aria-label={t('groups.formSplit')} className="grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1">
          {[
            ['equal', t('groups.splitEqual')],
            ['exact', t('groups.splitExact')],
            ['percent', t('groups.splitPercent')],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              onClick={() => setMode(id)}
              className={`min-h-[2.75rem] rounded-xl px-2 text-[13px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${mode === id ? 'bg-ink text-white shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {people.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-3.5 py-2.5">
              {mode === 'equal' && (
                <input type="checkbox" checked={included.has(member.id)} onChange={() => toggle(member.id)} aria-label={member.name} className="h-5 w-5 shrink-0 accent-ink" />
              )}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-ink">{initialsOf(member.name)}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{member.id === me ? `${member.name} (${t('groups.you')})` : member.name}</span>
              {mode === 'equal' ? (
                <span className="whitespace-nowrap text-sm tabular-nums text-muted">{included.has(member.id) ? formatMoney(fromMinor(equal[member.id] || 0), { decimals: 2, currency }) : '-'}</span>
              ) : mode === 'percent' ? (
                <span className="flex items-center gap-2">
                  <span className="hidden whitespace-nowrap text-xs tabular-nums text-muted sm:inline">{pctMinor[member.id] ? formatMoney(fromMinor(pctMinor[member.id]), { decimals: 2, currency }) : ''}</span>
                  <span className="relative w-24">
                    <MoneyInput value={percents[member.id] || ''} onChange={(value) => setPercents((prev) => ({ ...prev, [member.id]: value }))} placeholder="0" aria-label={member.name} className={`${field} pe-7 text-end tabular-nums`} />
                    <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
                  </span>
                </span>
              ) : (
                <MoneyInput value={parts[member.id] || ''} onChange={(value) => setParts((prev) => ({ ...prev, [member.id]: value }))} placeholder="0" aria-label={member.name} className={`${field} w-28 text-end tabular-nums`} />
              )}
            </li>
          ))}
        </ul>
        {mode === 'percent' && (
          <p className={`text-sm font-medium tabular-nums ${pctLeft === 0 ? 'text-ink' : 'text-muted'}`}>
            {pctLeft === 0 ? t('groups.assigned') : pctLeft > 0 ? t('groups.percentLeft', { percent: pctLeft }) : t('groups.percentOver', { percent: -pctLeft })}
          </p>
        )}
        {mode === 'exact' && (
          <p className={`text-sm font-medium tabular-nums ${left === 0 && total > 0 ? 'text-ink' : 'text-muted'}`}>
            {left === 0 && total > 0 ? t('groups.assigned') : left > 0 ? t('groups.leftToAssign', { amount: formatMoney(fromMinor(left), { decimals: 2, currency }) }) : t('groups.overAssigned', { amount: formatMoney(fromMinor(-left), { decimals: 2, currency }) })}
          </p>
        )}
      </div>

      {error && <p role="alert" className="rounded-xl bg-surface px-4 py-3 text-sm text-ink">{error}</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">
          {t('common.cancel')}
        </button>
        <div className="sm:w-40">
          <Button type="submit" loading={busy} loadingLabel={t('common.saving')}>
            {t('groups.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}
