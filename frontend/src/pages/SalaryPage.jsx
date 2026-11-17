import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import AllocationForm from '../components/salary/AllocationForm.jsx';
import AllocationList from '../components/salary/AllocationList.jsx';
import SalaryHistory from '../components/salary/SalaryHistory.jsx';
import SalaryOverview from '../components/salary/SalaryOverview.jsx';
import { btn, card } from '../components/salary/ui.js';
import { useIncome } from '../context/IncomeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { notify } from '../i18n/notifications.js';
import { useResource } from '../data/useResource.js';
import useExpenseCategories from '../hooks/useExpenseCategories.js';
import { useAppReducedMotion } from '../hooks/useMotionPreference.js';
import { monthKey, shiftMonth } from '../utils/expenseMath.js';
import { comparePlan, isSavingsLine, monthlyNet, summarizeAllocations } from '../utils/salaryPlanMath.js';
import { saveSalaryPlan } from '../services/salaryPlanService.js';

const NONE = [];
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
  const plan = planResource.data ? planResource.data.plan : null;
  const logs = logsResource.data ? logsResource.data.plans : NONE;
  const totalsResource = useResource('expenseTotals', {}, { enabled: logs.length > 0 });
  const totals = totalsResource.data ? totalsResource.data.totals : NONE;
  const saved = plan ? plan.lines : NONE;
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

  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  useEffect(() => {
    setEditing(null);
  }, [month]);

  const summary = useMemo(() => summarizeAllocations(salary, lines), [salary, lines]);
  const result = useMemo(() => comparePlan({ income: salary, lines, expenses, rates, currency }), [salary, lines, expenses, rates, currency]);
  const names = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const expenseCategories = useMemo(() => categories.filter((category) => (category.type ? category.type === 'expense' : true) && !category.isArchived), [categories]);

  const persist = async (next, { isDetached = detached, message, amountNow = salary, currencyNow = currency } = {}) => {
    const previous = lines;
    setLines(next);
    setBusy(true);
    try {
      await saveSalaryPlan(month, {
        streamId: stream ? stream.id : plan ? plan.streamId : null,
        lines: next.map((line) => {
          const savings = isSavingsLine(line);
          return { label: line.label, amount: line.amount, categoryId: savings ? null : line.categoryId || null, kind: savings ? 'savings' : 'spend' };
        }),
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

  const detach = () => persist(lines, { isDetached: true, amountNow: streamNet, currencyNow: stream.currency, message: t('salary.detached') });
  const attach = () => persist(lines, { isDetached: false, message: t('salary.attached') });

  const submit = ({ label, amount, category }) => {
    let kind = 'spend';
    let categoryId = null;
    if (category === 'savings') kind = 'savings';
    else if (category) categoryId = category;
    else {
      // no category picked: a name that matches an expense category still tracks its spending
      const match = categories.find((item) => item.name.trim().toLowerCase() === label.toLowerCase());
      if (match) categoryId = match.id;
      else if (isSavingsLine({ label })) kind = 'savings';
    }
    const entry = { id: editing || `new-${Date.now()}`, label, amount, categoryId, kind };
    const next = editing ? lines.map((line) => (line.id === editing ? entry : line)) : [...lines, entry];
    setEditing(null);
    return persist(next, { message: t('salary.saved') });
  };

  const startEdit = (line) => {
    setEditing(line.id);
    if (formRef.current) formRef.current.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'nearest' });
  };

  const editingLine = editing ? lines.find((line) => line.id === editing) : null;
  const monthLabel = (key) => formatDate(new Date(`${key}-01T00:00:00Z`), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const money = (value) => formatMoney(value, { decimals: 0, maxDecimals: 2, currency });
  const hasPlan = lines.length > 0;

  return (
    <AppShell showLogo pageTitle={t('salary.title')} items={items} activeId={activeId}>
      <div className="mx-auto w-full max-w-[1080px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('salary.title')}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">{t('salary.tagline')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 min-w-0 flex-1 items-center rounded-lg border border-border bg-white sm:flex-none">
              <button type="button" aria-label={t('expenses.prevMonth')} onClick={() => setMonth((value) => shiftMonth(value, -1))} className="flex h-full w-9 items-center justify-center rounded-s-lg text-muted outline-none transition hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30"><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></button>
              <span aria-live="polite" className="min-w-0 flex-1 whitespace-nowrap px-2 text-center text-sm font-medium text-ink sm:min-w-[8.5rem] sm:flex-none">{monthLabel(month)}</span>
              <button type="button" aria-label={t('expenses.nextMonth')} onClick={() => setMonth((value) => shiftMonth(value, 1))} className="flex h-full w-9 items-center justify-center rounded-e-lg text-muted outline-none transition hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30"><ChevronRight className="h-4 w-4 rtl:rotate-180" /></button>
            </div>
            <button type="button" onClick={() => setMonth(month === nowMonth ? shiftMonth(nowMonth, 1) : nowMonth)} className={btn.secondary}>
              {month === nowMonth ? t('salary.planNext') : t('salary.thisMonth')}
            </button>
          </div>
        </header>

        {!stream && !detached ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted"><Wallet className="h-5 w-5" strokeWidth={1.5} /></span>
            <p className="mt-4 max-w-sm text-sm font-medium text-ink">{t('salary.noStream')}</p>
            <Link to="/income" className={`${btn.primary} mt-5`}>{t('salary.goIncome')}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5">
            <div className="lg:col-start-2 lg:row-start-1 lg:self-start">
              <div className="lg:sticky lg:top-6">
                <SalaryOverview
                  summary={summary}
                  currency={currency}
                  spent={result.spent}
                  afterSpending={hasPlan || result.spent > 0 ? result.saving : null}
                  stream={stream}
                  detached={detached}
                  canWrite={canWrite}
                  busy={busy}
                  onDisconnect={detach}
                  onReconnect={attach}
                  sources={sources}
                  onPickSource={setStreamId}
                  salaryDraft={salaryDraft}
                  onSalaryDraft={setSalaryDraft}
                  onSalaryCommit={commitSalary}
                  money={money}
                />
              </div>
            </div>

            <section className={`${card} p-4 sm:p-5 lg:col-start-1 lg:row-start-1`} aria-labelledby="alloc-title">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="alloc-title" className="text-base font-semibold tracking-tight text-ink">{t('salary.allocationsTitle')}</h2>
                <span className="whitespace-nowrap text-sm tabular-nums text-muted">{money(summary.allocated)}</span>
              </div>

              {canWrite && (
                <div ref={formRef} className="mt-4 scroll-mt-4 rounded-lg bg-surface/70 p-3 sm:p-4">
                  {editingLine && <p className="mb-3 text-sm font-medium text-ink">{t('salary.editing')}</p>}
                  <AllocationForm
                    key={editing || 'new'}
                    initial={editingLine ? { label: editingLine.label, amount: editingLine.amount, category: isSavingsLine(editingLine) ? 'savings' : editingLine.categoryId || '' } : null}
                    categories={expenseCategories}
                    busy={busy}
                    onSubmit={submit}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              )}

              {lines.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">{t('salary.emptyLines')}</p>
              ) : (
                <div className="mt-4">
                  <AllocationList
                    rows={result.rows}
                    names={names}
                    money={money}
                    canWrite={canWrite}
                    busy={busy}
                    editingId={editing}
                    onEdit={startEdit}
                    onDelete={(line) => {
                      if (editing === line.id) setEditing(null);
                      persist(lines.filter((item) => item.id !== line.id), { message: t('salary.deleted') });
                    }}
                  />
                </div>
              )}

              {result.outside > 0 && (
                <p className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-surface px-4 py-2.5 text-sm"><span className="text-muted">{t('salary.unplanned')}</span><span className="whitespace-nowrap font-semibold tabular-nums text-ink">{money(result.outside)}</span></p>
              )}
            </section>

            <div className="lg:col-span-2">
              <SalaryHistory logs={logs} month={month} nowMonth={nowMonth} totals={totals} rates={rates} fallbackCurrency={currency} monthLabel={monthLabel} onOpen={setMonth} />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
