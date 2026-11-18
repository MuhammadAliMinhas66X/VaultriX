import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Minus, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import MoneyInput from '../MoneyInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { notify } from '../../i18n/notifications.js';
import { useResource } from '../../data/useResource.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { goalProgress } from '../../utils/reportMath.js';
import { createGoal, updateGoal, removeGoal, addContribution, removeContribution } from '../../services/planningService.js';

const NONE = [];
const card = 'rounded-2xl border border-border bg-white p-4 sm:p-5';
const field = 'w-full rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';
const today = () => new Date().toISOString().slice(0, 10);

function Ring({ ratio, done, calm }) {
  const radius = 34;
  const length = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="40" cy="40" r={radius} fill="none" stroke="#f0f0f2" strokeWidth="8" />
      <motion.circle cx="40" cy="40" r={radius} fill="none" stroke={done ? '#16a34a' : '#111114'} strokeWidth="8" strokeLinecap="round" strokeDasharray={length} initial={calm ? false : { strokeDashoffset: length }} animate={{ strokeDashoffset: length * (1 - ratio) }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
    </svg>
  );
}

function GoalForm({ goal, currency, onDone, onCancel }) {
  const { t, tServer } = useTranslation();
  const [name, setName] = useState(goal ? goal.name : '');
  const [target, setTarget] = useState(goal ? String(goal.target) : '');
  const [deadline, setDeadline] = useState(goal && goal.deadline ? goal.deadline : '');
  const [busy, setBusy] = useState(false);
  const valid = name.trim() && Number(target) > 0;

  const submit = async (event) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const payload = { name: name.trim(), target: Number(target), currency: goal ? goal.currency : currency, deadline: deadline || null };
      if (goal) await updateGoal(goal.id, payload);
      else await createGoal(payload);
      notify.success(t('reports.goalSaved'));
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
        <h2 className="text-base font-semibold text-ink">{goal ? t('reports.editGoal') : t('reports.addGoal')}</h2>
        <button type="button" aria-label={t('common.close')} onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface"><X className="h-4 w-4" /></button>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t('reports.goalName')}</span>
        <input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder={t('reports.goalNamePlaceholder')} className={field} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t('reports.goalTarget')}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted">{goal ? goal.currency : currency}</span>
          <MoneyInput value={target} onChange={setTarget} aria-label={t('reports.goalTarget')} className={field} />
        </div>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t('reports.goalDeadline')}</span>
        <input type="date" min={today()} value={deadline} onChange={(event) => setDeadline(event.target.value)} className={field} />
      </label>
      <button type="submit" disabled={busy || !valid} className="rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">{t('reports.save')}</button>
    </form>
  );
}

function GoalCard({ goal, canWrite, calm, onEdit }) {
  const { t, tServer } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const [mode, setMode] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [asking, setAsking] = useState(false);
  const progress = goalProgress(goal, today());
  const money = (value) => formatMoney(value, { currency: goal.currency });

  const submit = async (event) => {
    event.preventDefault();
    if (!(Number(amount) > 0)) return;
    setBusy(true);
    try {
      await addContribution(goal.id, { amount: Number(amount), direction: mode, note: note.trim() });
      setMode(null);
      setAmount('');
      setNote('');
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  const dropGoal = async () => {
    if (!asking) {
      setAsking(true);
      return;
    }
    try {
      await removeGoal(goal.id);
    } catch (error) {
      notify.error(tServer(error));
    }
  };

  const dropEntry = async (id) => {
    try {
      await removeContribution(goal.id, id);
    } catch (error) {
      notify.error(tServer(error));
    }
  };

  const status = progress.done ? t('reports.goalDone') : progress.overdue ? t('reports.goalOverdue') : progress.perMonth !== null ? t('reports.goalPerMonth', { amount: money(progress.perMonth) }) : t('reports.goalLeft', { amount: money(progress.left) });

  return (
    <li className={card}>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Ring ratio={progress.ratio} done={progress.done} calm={calm} />
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-ink">{Math.round(progress.ratio * 100)}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-base font-semibold text-ink">{goal.name}</p>
            {canWrite && (
              <div className="flex shrink-0 items-center gap-0.5">
                <button type="button" aria-label={t('reports.edit')} onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"><Pencil className="h-4 w-4" /></button>
                <button type="button" aria-label={t('reports.remove')} onClick={dropGoal} onBlur={() => setAsking(false)} className={`flex h-8 items-center justify-center rounded-lg text-xs font-medium transition ${asking ? 'bg-red-600 px-2.5 text-white' : 'w-8 text-muted hover:bg-surface hover:text-ink'}`}>
                  {asking ? t('reports.sure') : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>
          <p className="mt-0.5 whitespace-nowrap text-sm tabular-nums text-muted"><span className="font-semibold text-ink">{money(goal.saved)}</span> / {money(goal.target)}</p>
          <p className={`mt-1 text-xs font-medium ${progress.overdue ? 'text-red-600' : 'text-muted'}`}>
            {status}{goal.deadline && !progress.done ? ` · ${formatDate(new Date(`${goal.deadline}T00:00:00Z`), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}` : ''}
          </p>
        </div>
      </div>

      {canWrite && mode === null && (
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setMode('in')} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2.5 text-sm font-medium text-white transition hover:opacity-90"><Plus className="h-4 w-4" />{t('reports.addMoney')}</button>
          <button type="button" onClick={() => setMode('out')} disabled={goal.saved <= 0} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-surface disabled:opacity-50"><Minus className="h-4 w-4" />{t('reports.takeOut')}</button>
        </div>
      )}

      {mode !== null && (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3 rounded-xl bg-surface p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted">{goal.currency}</span>
            <MoneyInput autoFocus value={amount} onChange={setAmount} aria-label={mode === 'in' ? t('reports.addMoney') : t('reports.takeOut')} className={`${field} bg-white`} />
          </div>
          <input value={note} maxLength={80} onChange={(event) => setNote(event.target.value)} placeholder={t('reports.notePlaceholder')} className={`${field} bg-white`} />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !(Number(amount) > 0)} className="flex-1 rounded-xl bg-ink px-3 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">{mode === 'in' ? t('reports.addMoney') : t('reports.takeOut')}</button>
            <button type="button" onClick={() => { setMode(null); setAmount(''); }} className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-ink">{t('common.cancel')}</button>
          </div>
        </form>
      )}

      {goal.contributions.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <button type="button" onClick={() => setShowLog((value) => !value)} aria-expanded={showLog} className="flex w-full items-center justify-between text-xs font-medium text-muted transition hover:text-ink">
            {t('reports.history', { count: goal.contributions.length })}
            <ChevronDown className={`h-4 w-4 transition ${showLog ? 'rotate-180' : ''}`} />
          </button>
          {showLog && (
            <ul className="mt-2 divide-y divide-border">
              {goal.contributions.slice(0, 20).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{entry.note || (entry.amount >= 0 ? t('reports.addMoney') : t('reports.takeOut'))}</p>
                    <p className="text-xs text-muted">{formatDate(new Date(`${entry.date}T00:00:00Z`), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`whitespace-nowrap text-sm font-semibold tabular-nums ${entry.amount >= 0 ? 'text-ink' : 'text-muted'}`}>{entry.amount >= 0 ? '+' : '−'}{money(Math.abs(entry.amount))}</span>
                    {canWrite && <button type="button" aria-label={t('reports.remove')} onClick={() => dropEntry(entry.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink"><X className="h-3.5 w-3.5" /></button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export default function Goals({ canWrite }) {
  const { t } = useTranslation();
  const { currency } = useAuth();
  const calm = useAppReducedMotion();
  const resource = useResource('goals');
  const goals = resource.data ? resource.data.goals : NONE;
  const [form, setForm] = useState(null);

  return (
    <div className="flex flex-col gap-5">
      {canWrite && form === null && (
        <button type="button" onClick={() => setForm('new')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 sm:w-auto sm:self-start">
          <Plus className="h-4 w-4" />{t('reports.addGoal')}
        </button>
      )}
      {form !== null && <GoalForm goal={form === 'new' ? null : goals.find((item) => item.id === form)} currency={currency} onDone={() => setForm(null)} onCancel={() => setForm(null)} />}

      {goals.length === 0 && form === null ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted"><Target className="h-6 w-6" strokeWidth={1.5} /></span>
          <p className="mt-4 max-w-sm text-base font-medium text-ink">{t('reports.noGoals')}</p>
          <p className="mt-1.5 max-w-sm text-sm text-muted">{t('reports.noGoalsHint')}</p>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {goals.map((goal) => <GoalCard key={goal.id} goal={goal} canWrite={canWrite} calm={calm} onEdit={() => setForm(goal.id)} />)}
        </ul>
      )}
    </div>
  );
}
