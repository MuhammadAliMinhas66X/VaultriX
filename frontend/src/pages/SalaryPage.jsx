import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Link2, Pencil, Plus, Unlink, Wallet, X } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import Combobox from '../components/Combobox.jsx';
import MoneyInput from '../components/MoneyInput.jsx';
import SalaryRing from '../components/salary/SalaryRing.jsx';
import { useIncome } from '../context/IncomeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { notify } from '../i18n/notifications.js';
import { useResource } from '../data/useResource.js';
import useExpenseCategories from '../hooks/useExpenseCategories.js';
import { useAppReducedMotion } from '../hooks/useMotionPreference.js';
import { monthKey, shiftMonth } from '../utils/expenseMath.js';
import { comparePlan, monthlyNet, spentInMonth } from '../utils/salaryPlanMath.js';
import { saveSalaryPlan } from '../services/salaryPlanService.js';

const field = 'w-full rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';
const NONE = [];
const CHIPS = ['salary.chipRent', 'salary.chipFood', 'salary.chipBills', 'salary.chipTransport', 'salary.chipFamily', 'salary.chipSavings'];
const round2 = (value) => Math.round(value * 100) / 100;

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

  const planResource = useResource('salaryPlan', { month });
  const expensesResource = useResource('expenses', { month });
  const logsResource = useResource('salaryPlans');
  const previousResource = useResource('salaryPlan', { month: shiftMonth(month, -1) });
  const receiptsResource = useResource('receipts');
  const billsResource = useResource('bills', { today: new Date().toISOString().slice(0, 10) });
  const plan = planResource.data ? planResource.data.plan : null;
  const logs = logsResource.data ? logsResource.data.plans : NONE;
  const totalsResource = useResource('expenseTotals', {}, { enabled: logs.length > 0 });
  const totals = totalsResource.data ? totalsResource.data.totals : NONE;
  const saved = plan ? plan.lines : NONE;
  const previousLines = previousResource.data ? previousResource.data.plan.lines : NONE;
  const receipts = receiptsResource.data ? receiptsResource.data.receipts : NONE;
  const allBills = billsResource.data ? billsResource.data.bills : NONE;
  const expenses = expensesResource.data ? expensesResource.data.expenses : NONE;

  const detached = Boolean(plan && plan.detached);
  const streamNet = round2(monthlyNet(stream));
  const salary = detached ? plan.salary : streamNet;
  const currency = detached && plan.currency ? plan.currency : stream ? stream.currency : baseCurrency;

  const [lines, setLines] = useState(NONE);
  useEffect(() => {
    setLines(saved);
  }, [saved]);
  useEffect(() => {
    if (plan && plan.streamId) setStreamId(plan.streamId);
  }, [plan]);

  const [salaryDraft, setSalaryDraft] = useState('');
  useEffect(() => {
    setSalaryDraft(detached ? String(plan.salary) : '');
  }, [detached, plan]);

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const result = useMemo(() => comparePlan({ income: salary, lines, expenses, rates, currency }), [salary, lines, expenses, rates, currency]);
  const names = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const used = detached ? result.committed : result.spent;
  const left = round2(salary - used);

  const persist = async (next, { isDetached = detached, message, amountNow = salary, currencyNow = currency } = {}) => {
    const previous = lines;
    setLines(next);
    setBusy(true);
    try {
      await saveSalaryPlan(month, {
        streamId: stream ? stream.id : plan ? plan.streamId : null,
        lines: next.map((line) => ({ label: line.label, amount: line.amount, categoryId: line.categoryId || null })),
        detached: isDetached,
        salary: isDetached ? amountNow : 0,
        currency: isDetached ? currencyNow : null,
      });
      if (message) notify.success(message);
      planResource.reload();
      logsResource.reload();
    } catch (failure) {
      setLines(previous);
      notify.error(tServer(failure));
    } finally {
      setBusy(false);
    }
  };

  const commitSalary = () => {
    const value = Number(salaryDraft);
    if (!(value > 0)) return setSalaryDraft(String(plan.salary));
    if (value === plan.salary) return undefined;
    return persist(lines, { isDetached: true, amountNow: value, currencyNow: currency, message: t('salary.saved') });
  };

  const copyLast = () => persist(previousLines.map((line, index) => ({ id: `copy-${index}`, label: line.label, amount: line.amount, categoryId: line.categoryId || null })), { message: t('salary.copied') });

  const dueBills = useMemo(() => allBills.filter((bill) => !bill.cancelledAt && bill.remaining > 0 && bill.currency === currency && String(bill.dueAt).slice(0, 7) === month && !lines.some((line) => line.label.trim().toLowerCase() === bill.billerName.trim().toLowerCase())).slice(0, 8), [allBills, currency, month, lines]);

  const arrival = useMemo(() => {
    if (!stream || month > nowMonth) return null;
    const found = receipts.find((item) => item.streamId === stream.id && String(item.receivedAt).slice(0, 7) === month);
    return found ? found.receivedAt : false;
  }, [receipts, stream, month, nowMonth]);

  const detach = () => persist(lines, { isDetached: true, amountNow: streamNet, currencyNow: stream.currency, message: t('salary.detached') });
  const attach = () => persist(lines, { isDetached: false, message: t('salary.attached') });

  const reset = () => {
    setLabel('');
    setAmount('');
    setEditing(null);
    setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    const value = Number(amount);
    const name = label.trim();
    if (!name || !(value > 0)) return setError(t('salary.errCheck'));
    const match = categories.find((category) => category.name.trim().toLowerCase() === name.toLowerCase());
    const entry = { id: editing || `new-${Date.now()}`, label: name, amount: value, categoryId: match ? match.id : null };
    const next = editing ? lines.map((line) => (line.id === editing ? { ...entry, categoryId: entry.categoryId || line.categoryId || null } : line)) : [...lines, entry];
    reset();
    return persist(next);
  };

  const startEdit = (line) => {
    setEditing(line.id);
    setLabel(line.label);
    setAmount(String(line.amount));
    setError('');
  };

  const monthLabel = (key) => formatDate(new Date(`${key}-01T00:00:00Z`), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const over = left < 0;
  const streamItems = sources.map((item) => ({ value: item.id, label: item.name, sub: item.currency }));
  const money = (value) => formatMoney(value, { decimals: 0, currency });

  return (
    <AppShell showLogo pageTitle={t('salary.title')} items={items} activeId={activeId}>
      <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('salary.title')}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">{t('salary.tagline')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMonth(month === nowMonth ? shiftMonth(nowMonth, 1) : nowMonth)} className="whitespace-nowrap rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm font-medium text-ink transition hover:bg-surface">
              {month === nowMonth ? t('salary.planNext') : t('salary.thisMonth')}
            </button>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1">
              <button type="button" aria-label={t('expenses.prevMonth')} onClick={() => setMonth((value) => shiftMonth(value, -1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></button>
              <span className="min-w-[8.5rem] text-center text-sm font-semibold text-ink">{monthLabel(month)}</span>
              <button type="button" aria-label={t('expenses.nextMonth')} onClick={() => setMonth((value) => shiftMonth(value, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"><ChevronRight className="h-4 w-4 rtl:rotate-180" /></button>
            </div>
          </div>
        </div>

        {!stream && !detached ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted"><Wallet className="h-6 w-6" strokeWidth={1.5} /></span>
            <p className="mt-4 max-w-sm text-base font-medium text-ink">{t('salary.noStream')}</p>
            <Link to="/income" className="mt-5 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">{t('salary.goIncome')}</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {!detached && sources.length > 1 && (
              <div className="flex max-w-sm flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">{t('salary.source')}</span>
                <Combobox items={streamItems} searchable={sources.length > 6} ariaLabel={t('salary.source')} value={stream.id} onChange={setStreamId} />
              </div>
            )}

            <motion.section initial={calm ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="sticky top-[4.25rem] z-10 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-[118px] shrink-0 sm:w-[150px]">
                  <SalaryRing total={salary} used={used} currency={currency} leftLabel={t('salary.ringLeft')} detached={detached} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
                  <div className="min-w-0">
                    {detached && <span className="mb-1.5 inline-block rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">{t('salary.detachedBadge')}</span>}
                    <p className="truncate text-lg font-semibold tracking-tight text-ink">{stream ? stream.name : t('salary.attachedBadge')}</p>
                    {arrival !== null && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                        <span className={`h-1.5 w-1.5 rounded-full ${arrival ? 'bg-emerald-500' : 'bg-border'}`} />
                        {arrival ? t('salary.arrived', { date: formatDate(new Date(arrival), { day: 'numeric', month: 'short', timeZone: 'UTC' }) }) : t('salary.notArrived')}
                      </p>
                    )}
                  </div>
                  {canWrite && (
                    <button type="button" disabled={busy} onClick={detached ? attach : detach} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 ${detached ? 'border border-border text-ink hover:bg-surface' : 'bg-ink text-white hover:opacity-90'}`}>
                      {detached ? <Link2 className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
                      {detached ? t('salary.attach') : t('salary.detach')}
                    </button>
                  )}
                </div>
              </div>
            </motion.section>

            {detached && (
              <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                <p className="text-sm text-muted">{t('salary.totalLabel')}</p>
                <div className="mt-2 flex items-baseline gap-2.5 border-b border-border pb-2 focus-within:border-ink">
                  <span className="text-lg font-medium text-muted">{currency}</span>
                  <MoneyInput value={salaryDraft} onChange={setSalaryDraft} disabled={!canWrite} onBlur={commitSalary} onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()} aria-label={t('salary.totalLabel')} className="w-full min-w-0 bg-transparent text-3xl font-semibold tabular-nums tracking-tight text-ink outline-none" />
                </div>
                {canWrite && (
                  <div className="mt-4 flex flex-col gap-2.5">
                  <div className="flex flex-wrap gap-2">
                    {CHIPS.map((key) => (
                      <button key={key} type="button" onClick={() => setLabel(t(key))} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition hover:border-ink/40 hover:text-ink">{t(key)}</button>
                    ))}
                  </div>
                  {dueBills.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted">{t('salary.fromBills')}</span>
                      <div className="flex flex-wrap gap-2">
                        {dueBills.map((bill) => (
                          <button key={bill.id} type="button" onClick={() => { setLabel(bill.billerName.slice(0, 40)); setAmount(String(bill.remaining)); }} className="whitespace-nowrap rounded-full border border-border px-3 py-1 text-xs font-medium text-ink transition hover:border-ink/40 hover:bg-surface">{bill.billerName} · {money(bill.remaining)}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                )}

                {canWrite && (
                  <form onSubmit={submit} noValidate className="mt-3 flex flex-col gap-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-end">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-ink">{t('salary.lineLabel')}</span>
                        <input value={label} maxLength={40} onChange={(event) => setLabel(event.target.value)} placeholder={t('salary.lineLabelPlaceholder')} className={field} />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-ink">{t('salary.lineAmount')}</span>
                        <MoneyInput value={amount} onChange={setAmount} placeholder="0" className={`${field} tabular-nums`} />
                      </label>
                      <div className="flex gap-2">
                        <button type="submit" disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60 sm:flex-none">
                          {!editing && <Plus className="h-4 w-4" />}
                          {editing ? t('salary.saveLine') : t('salary.addLine')}
                        </button>
                        {editing && <button type="button" onClick={reset} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">{t('common.cancel')}</button>}
                      </div>
                    </div>
                    {error && <p role="alert" className="text-sm font-medium text-ink">{error}</p>}
                  </form>
                )}

                {lines.length === 0 ? (
                  <div className="mt-5 flex flex-col items-center gap-3 rounded-xl bg-surface px-4 py-6 text-center">
                    <p className="text-sm text-muted">{t('salary.emptyLines')}</p>
                    {canWrite && previousLines.length > 0 && <button type="button" disabled={busy} onClick={copyLast} className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface disabled:opacity-60">{t('salary.copyLast')}</button>}
                  </div>
                ) : (
                  <ul className="mt-5 flex flex-col gap-2.5">
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
                                {tracked && <span className="block text-xs leading-snug text-muted">{t('salary.spentOf', { spent: money(line.spent), planned: money(line.amount) })}{line.categoryId && names.get(line.categoryId) ? ` · ${names.get(line.categoryId)}` : ''}</span>}
                              </span>
                              <span className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{money(line.amount)}</span>
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
                  <p className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-2.5 text-sm"><span className="text-muted">{t('salary.unplanned')}</span><span className="whitespace-nowrap font-semibold tabular-nums text-ink">{money(result.outside)}</span></p>
                )}
                {over && <p className="mt-3 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white">{t('salary.over', { amount: money(-left) })}</p>}
              </section>
            )}

            <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
              <h2 className="text-base font-bold tracking-tight text-ink">{t('salary.logsTitle')}</h2>
              {logs.length === 0 ? (
                <p className="mt-4 rounded-xl bg-surface px-4 py-6 text-center text-sm text-muted">{t('salary.logsEmpty')}</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2.5">
                  {logs.map((log) => {
                    const logCurrency = log.currency || currency;
                    const plannedSaving = round2(log.salary - log.planned);
                    const actualLeft = log.month <= nowMonth && rates ? round2(log.salary - spentInMonth(totals, log.month, rates, logCurrency)) : null;
                    const fmt = (value) => formatMoney(value, { decimals: 0, currency: logCurrency });
                    return (
                      <li key={log.month}>
                        <button type="button" onClick={() => setMonth(log.month)} className={`w-full rounded-xl border px-4 py-3 text-start transition hover:bg-surface ${log.month === month ? 'border-ink' : 'border-border'}`}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-ink">{monthLabel(log.month)}</span>
                            <span className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{fmt(log.salary)}</span>
                          </div>
                          <dl className="mt-2 grid grid-cols-3 gap-3 text-xs">
                            <div><dt className="text-muted">{t('salary.logPlanned')}</dt><dd className="mt-0.5 whitespace-nowrap font-semibold tabular-nums text-ink">{fmt(log.planned)}</dd></div>
                            <div><dt className="text-muted">{t('salary.logPlannedSaving')}</dt><dd className="mt-0.5 whitespace-nowrap font-semibold tabular-nums text-ink">{fmt(plannedSaving)}</dd></div>
                            <div><dt className="text-muted">{t('salary.logActualLeft')}</dt><dd className="mt-0.5 whitespace-nowrap font-semibold tabular-nums text-ink">{actualLeft === null ? t('salary.logNotYet') : fmt(actualLeft)}</dd></div>
                          </dl>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
