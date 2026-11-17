import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pencil, Plus, Wallet, X } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import Combobox from '../components/Combobox.jsx';
import MoneyInput from '../components/MoneyInput.jsx';
import SalaryRing, { CountUp } from '../components/salary/SalaryRing.jsx';
import { useIncome } from '../context/IncomeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { notify } from '../i18n/notifications.js';
import { useResource } from '../data/useResource.js';
import useExpenseCategories from '../hooks/useExpenseCategories.js';
import { useAppReducedMotion } from '../hooks/useMotionPreference.js';
import { monthKey, shiftMonth } from '../utils/expenseMath.js';
import { comparePlan, monthlyNet } from '../utils/salaryPlanMath.js';
import { saveSalaryPlan } from '../services/salaryPlanService.js';

const field = 'w-full rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';
const CHIPS = [
  ['salary.chipRent'],
  ['salary.chipFood'],
  ['salary.chipBills'],
  ['salary.chipTransport'],
  ['salary.chipFamily'],
  ['salary.chipSavings'],
];
const NONE = [];

function Tile({ label, value, currency, strong }) {
  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <CountUp value={value} currency={currency} className={`mt-1.5 block text-lg font-bold tracking-tight ${strong ? 'text-ink' : 'text-ink'}`} />
    </div>
  );
}

export default function SalaryPage() {
  const { t, tServer } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const { currency: baseCurrency, user } = useAuth();
  const { streams, rates } = useIncome();
  const { items, activeId } = useAppNav();
  const calm = useAppReducedMotion();
  const canWrite = user?.role !== 'viewer';
  const { categories } = useExpenseCategories();

  const nowMonth = monthKey(new Date());
  const [month, setMonth] = useState(nowMonth);
  const sources = useMemo(() => streams.filter((stream) => stream.expectedAmount > 0).sort((a, b) => (a.incomeType === 'salaried' ? -1 : 1) - (b.incomeType === 'salaried' ? -1 : 1)), [streams]);
  const [streamId, setStreamId] = useState('');
  const stream = sources.find((item) => item.id === streamId) || sources[0] || null;
  const currency = stream ? stream.currency : baseCurrency;
  const income = monthlyNet(stream);

  const planResource = useResource('salaryPlan', { month });
  const expensesResource = useResource('expenses', { month });
  const saved = planResource.data ? planResource.data.plan.lines : NONE;
  const expenses = expensesResource.data ? expensesResource.data.expenses : NONE;

  const [lines, setLines] = useState(NONE);
  useEffect(() => {
    setLines(saved);
  }, [saved]);
  useEffect(() => {
    if (planResource.data && planResource.data.plan.streamId) setStreamId(planResource.data.plan.streamId);
  }, [planResource.data]);

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const result = useMemo(() => comparePlan({ income, lines, expenses, rates, currency }), [income, lines, expenses, rates, currency]);
  const names = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const categoryItems = useMemo(() => [{ value: '', label: t('salary.noCategory') }, ...categories.map((category) => ({ value: category.id, label: category.name }))], [categories, t]);

  const persist = async (next, successMessage) => {
    const previous = lines;
    setLines(next);
    setBusy(true);
    try {
      await saveSalaryPlan(month, { streamId: stream ? stream.id : null, lines: next.map((line) => ({ label: line.label, amount: line.amount, categoryId: line.categoryId || null })) });
      if (successMessage) notify.success(successMessage);
      planResource.reload();
    } catch (failure) {
      setLines(previous);
      notify.error(tServer(failure));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setLabel('');
    setAmount('');
    setCategoryId('');
    setEditing(null);
    setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    const value = Number(amount);
    if (!label.trim() || !(value > 0)) return setError(t('salary.errCheck'));
    const entry = { id: editing || `new-${Date.now()}`, label: label.trim(), amount: value, categoryId: categoryId || null };
    const next = editing ? lines.map((line) => (line.id === editing ? entry : line)) : [...lines, entry];
    reset();
    return persist(next, t('salary.saved'));
  };

  const startEdit = (line) => {
    setEditing(line.id);
    setLabel(line.label);
    setAmount(String(line.amount));
    setCategoryId(line.categoryId || '');
    setError('');
  };

  const monthLabel = formatDate(new Date(`${month}-01T00:00:00Z`), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const over = result.leftToPlan < 0;
  const streamItems = sources.map((item) => ({ value: item.id, label: item.name, sub: item.currency }));

  return (
    <AppShell showLogo pageTitle={t('salary.title')} items={items} activeId={activeId}>
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('salary.title')}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">{t('salary.tagline')}</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1">
            <button type="button" aria-label={t('expenses.prevMonth')} onClick={() => setMonth((value) => shiftMonth(value, -1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></button>
            <span className="min-w-[8.5rem] text-center text-sm font-semibold text-ink">{monthLabel}</span>
            <button type="button" aria-label={t('expenses.nextMonth')} onClick={() => setMonth((value) => shiftMonth(value, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"><ChevronRight className="h-4 w-4 rtl:rotate-180" /></button>
          </div>
        </div>

        {!stream ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted"><Wallet className="h-6 w-6" strokeWidth={1.5} /></span>
            <p className="mt-4 max-w-sm text-base font-medium text-ink">{t('salary.noStream')}</p>
            <Link to="/income" className="mt-5 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">{t('salary.goIncome')}</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <motion.section initial={calm ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-border bg-white">
              <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:items-center md:gap-10">
                <SalaryRing income={income} spent={result.spent} planned={result.planned} currency={currency} />
                <div className="flex min-w-0 flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink">{t('salary.source')}</span>
                    <Combobox items={streamItems} searchable={sources.length > 6} ariaLabel={t('salary.source')} value={stream.id} onChange={setStreamId} />
                  </div>
                  <ul className="flex flex-col gap-2.5 text-sm">
                    <li className="flex items-center gap-2.5"><span className="h-3 w-3 shrink-0 rounded-full bg-ink" /><span className="flex-1 text-muted">{t('salary.ringSpent')}</span><span className="whitespace-nowrap font-semibold tabular-nums text-ink">{formatMoney(result.spent, { decimals: 0, currency })}</span></li>
                    <li className="flex items-center gap-2.5"><span className="h-3 w-3 shrink-0 rounded-full bg-[#8b8b92]" /><span className="flex-1 text-muted">{t('salary.planned')}</span><span className="whitespace-nowrap font-semibold tabular-nums text-ink">{formatMoney(result.planned, { decimals: 0, currency })}</span></li>
                    <li className="flex items-center gap-2.5"><span className="h-3 w-3 shrink-0 rounded-full bg-[#ececee] ring-1 ring-border" /><span className="flex-1 text-muted">{t('salary.income')}</span><span className="whitespace-nowrap font-semibold tabular-nums text-ink">{formatMoney(income, { decimals: 0, currency })}</span></li>
                  </ul>
                  {over && <p className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white">{t('salary.over', { amount: formatMoney(-result.leftToPlan, { decimals: 0, currency }) })}</p>}
                </div>
              </div>
            </motion.section>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile label={t('salary.income')} value={income} currency={currency} />
              <Tile label={t('salary.planned')} value={result.planned} currency={currency} />
              <Tile label={t('salary.leftToPlan')} value={result.leftToPlan} currency={currency} />
              <Tile label={t('salary.leftNow')} value={result.leftNow} currency={currency} />
            </div>

            <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
              <h2 className="text-base font-bold tracking-tight text-ink">{t('salary.planLines')}</h2>

              {lines.length === 0 ? (
                <p className="mt-4 rounded-xl bg-surface px-4 py-6 text-center text-sm text-muted">{t('salary.emptyLines')}</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  <AnimatePresence initial={false}>
                    {result.rows.map((line) => {
                      const tracked = line.spent !== null;
                      const ratio = tracked && line.amount > 0 ? Math.min(1, line.spent / line.amount) : 0;
                      const burst = tracked && line.spent > line.amount;
                      return (
                        <motion.li key={line.id} layout={!calm} initial={calm ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-border px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink">{line.label}</span>
                              <span className="block text-xs leading-snug text-muted">{tracked ? t('salary.spentOf', { spent: formatMoney(line.spent, { decimals: 0, currency }), planned: formatMoney(line.amount, { decimals: 0, currency }) }) : t('salary.untracked')}{line.categoryId && names.get(line.categoryId) ? ` · ${names.get(line.categoryId)}` : ''}</span>
                            </span>
                            <span className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{formatMoney(line.amount, { decimals: 0, currency })}</span>
                            {canWrite && (
                              <span className="flex shrink-0">
                                <button type="button" aria-label={t('salary.edit')} onClick={() => startEdit(line)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"><Pencil className="h-4 w-4" /></button>
                                <button type="button" aria-label={t('salary.remove')} disabled={busy} onClick={() => persist(lines.filter((item) => item.id !== line.id))} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink disabled:opacity-50"><X className="h-4 w-4" /></button>
                              </span>
                            )}
                          </div>
                          {tracked && (
                            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-border/70">
                              <motion.div initial={calm ? false : { width: 0 }} animate={{ width: `${Math.max(ratio * 100, line.spent > 0 ? 3 : 0)}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className={`h-full rounded-full ${burst ? 'bg-ink' : 'bg-[#8b8b92]'}`} />
                            </div>
                          )}
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}

              {result.outside > 0 && (
                <p className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-2.5 text-sm"><span className="text-muted">{t('salary.unplanned')}</span><span className="whitespace-nowrap font-semibold tabular-nums text-ink">{formatMoney(result.outside, { decimals: 0, currency })}</span></p>
              )}

              {canWrite && (
                <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
                  {!editing && (
                    <div className="flex flex-wrap gap-2">
                      {CHIPS.map(([key]) => (
                        <button key={key} type="button" onClick={() => setLabel(t(key))} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition hover:border-ink/40 hover:text-ink">{t(key)}</button>
                      ))}
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-ink">{t('salary.lineLabel')}</span>
                      <input value={label} maxLength={40} onChange={(event) => setLabel(event.target.value)} placeholder={t('salary.lineLabelPlaceholder')} className={field} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-ink">{t('salary.lineAmount')}</span>
                      <MoneyInput value={amount} onChange={setAmount} placeholder="0" className={`${field} tabular-nums`} />
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-ink">{t('salary.lineCategory')}</span>
                      <Combobox items={categoryItems} ariaLabel={t('salary.lineCategory')} value={categoryId} onChange={setCategoryId} />
                    </div>
                  </div>
                  {error && <p role="alert" className="text-sm font-medium text-ink">{error}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
                      {!editing && <Plus className="h-4 w-4" />} {editing ? t('salary.saveLine') : t('salary.addLine')}
                    </button>
                    {editing && <button type="button" onClick={reset} className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">{t('common.cancel')}</button>}
                  </div>
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
