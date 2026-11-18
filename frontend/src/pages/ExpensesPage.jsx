import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownRight, Paperclip, Plus, Receipt, Repeat, Search, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import Drawer from '../components/Drawer.jsx';
import MonthOverview from '../components/expenses/MonthOverview.jsx';
import { CategoryIcon } from '../components/expenses/categoryIcons.jsx';
import ExpenseForm from '../components/expenses/ExpenseForm.jsx';
import CategoryFilter from '../components/expenses/CategoryFilter.jsx';
import { ExpensesSkeleton } from '../components/Skeletons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useIncome } from '../context/IncomeContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { notify } from '../i18n/notifications.js';
import {
  listExpenses,
  createExpense,
  updateExpense,
  uploadExpenseReceipt,
  deleteExpense,
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from '../services/expenseService.js';
import { listLoans } from '../services/loanService.js';
import { analyze, breakdown, convertAmount, dayKey, shiftDay, shiftMonth, sumExpenses } from '../utils/expenseMath.js';
import { keyFor, customFor, todayLocal } from '../components/loans/loanOptions.js';

const REMEMBER_KEY = 'vaultrix.lastExpense';

const readRemembered = () => {
  try {
    return JSON.parse(window.localStorage.getItem(REMEMBER_KEY)) || {};
  } catch (error) {
    return {};
  }
};

const remember = (value) => {
  try {
    window.localStorage.setItem(REMEMBER_KEY, JSON.stringify(value));
  } catch (error) {
    return;
  }
};

function ExpensesPage() {
  const { currency, user } = useAuth();
  const canWrite = user?.role !== 'viewer';
  const { t, tServer } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const { currencies } = useLocalizedOptions();
  const { rates } = useIncome();
  const { items, activeId } = useAppNav();

  const todayKey = todayLocal();
  const nowMonth = todayKey.slice(0, 7);
  const [month, setMonth] = useState(nowMonth);
  const [expenses, setExpenses] = useState([]);
  const [capped, setCapped] = useState(false);
  const [previous, setPrevious] = useState([]);
  const [categories, setCategories] = useState([]);
  const [people, setPeople] = useState([]);
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState(null);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const listRef = useRef(null);

  const load = useCallback(
    async (target, first = false) => {
      const id = ++requestId.current;
      if (!first) setRefreshing(true);
      try {
        const [current, before] = await Promise.all([listExpenses(target), listExpenses(shiftMonth(target, -1))]);
        if (id !== requestId.current) return;
        setExpenses(current.expenses);
        setCapped(Boolean(current.capped));
        setPrevious(before.expenses);
      } catch (error) {
        if (id === requestId.current) notify.error(tServer(error));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [tServer]
  );

  useEffect(() => {
    load(month, loading);
  }, [month]);

  const loadPeople = useCallback(() => {
    listLoans()
      .then((data) => {
        setLoans(data.loans);
        setPeople([...new Set(data.loans.map((loan) => loan.personName))].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    loadPeople();
    listExpenseCategories()
      .then(setCategories)
      .catch((error) => notify.error(tServer(error)));
  }, []);

  const names = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const nameOf = (id) => (id && names.get(id)) || t('expenses.uncategorized');
  const spending = useMemo(() => expenses.filter((expense) => !expense.givenTo), [expenses]);
  const previousSpending = useMemo(() => previous.filter((expense) => !expense.givenTo), [previous]);
  const lentTotal = useMemo(() => sumExpenses(expenses.filter((expense) => expense.givenTo), rates, currency).total, [expenses, rates, currency]);
  const rows = useMemo(
    () =>
      breakdown(spending, rates, currency).map((row) => {
        const category = row.key === 'none' ? null : byId.get(row.key) || null;
        return { ...row, id: row.key === 'none' ? '' : row.key, category, name: category ? category.name : t('expenses.uncategorized') };
      }),
    [spending, rates, currency, byId]
  );

  const others = useMemo(() => sumExpenses(spending.filter((expense) => expense.paidBy === 'other'), rates, currency).total, [spending, rates, currency]);

  const stats = useMemo(() => analyze(spending, previousSpending, month, todayKey, rates, currency), [spending, previousSpending, month, todayKey, rates, currency]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const weekStart = shiftDay(todayKey, -6);
    return expenses.filter((expense) => {
      const key = dayKey(expense.spentAt);
      if (range === 'today' && key !== todayKey) return false;
      if (range === 'week' && key < weekStart) return false;
      if (categoryFilter && (expense.categoryId || '') !== categoryFilter) return false;
      if (needle && !`${expense.note} ${nameOf(expense.categoryId)}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [expenses, range, categoryFilter, query, todayKey, names]);

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((expense) => {
      const key = dayKey(expense.spentAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(expense);
    });
    return [...map.entries()].map(([key, list]) => ({
      key,
      list,
      total: list.reduce((sum, expense) => sum + (convertAmount(expense, rates, currency) || 0), 0),
    }));
  }, [filtered, rates, currency]);

  const monthLabel = formatDate(new Date(`${month}-01T00:00:00Z`), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const dayLabel = (key) => {
    if (key === todayKey) return t('expenses.today');
    if (key === shiftDay(todayKey, -1)) return t('expenses.yesterday');
    return formatDate(new Date(`${key}T00:00:00Z`), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  };

  const formFor = (expense) => {
    if (expense) {
      return {
        amount: String(expense.amount),
        currency: expense.currency,
        categoryId: expense.categoryId || '',
        payKey: keyFor(expense.payMethod, expense.payName),
        payCustom: customFor(expense.payMethod, expense.payName),
        date: dayKey(expense.spentAt),
        note: expense.note || '',
        repeat: expense.repeat || 'none',
        repeatOf: expense.repeatOf || null,
        receipt: expense.receipt || null,
        kind: expense.givenTo ? 'given' : expense.paidBy === 'other' ? 'borrowed' : 'spent',
        payer: expense.givenTo || expense.paidBy === 'other' ? (people.includes(expense.givenTo || expense.payerName) ? `person:${expense.givenTo || expense.payerName}` : 'new') : 'self',
        payerName: (expense.givenTo || expense.paidBy === 'other') && !people.includes(expense.givenTo || expense.payerName) ? expense.givenTo || expense.payerName : '',
      };
    }
    const last = readRemembered();
    const known = categories.some((category) => category.id === last.categoryId);
    return {
      amount: '',
      currency: last.currency || currency,
      categoryId: known ? last.categoryId : '',
      payKey: last.payKey || '',
      payCustom: last.payCustom || '',
      date: todayKey,
      note: '',
      repeat: 'none',
      repeatOf: null,
      kind: 'spent',
      payer: 'self',
      payerName: '',
    };
  };

  const closePanel = () => setPanel(null);

  const handleSubmit = async (payload, extra, receiptFile) => {
    setBusy(true);
    try {
      if (panel.mode === 'edit') {
        await updateExpense(panel.expense.id, payload);
        notify.success(t('expenses.updatedTitle'));
      } else {
        const created = await createExpense(payload);
        if (receiptFile && created.expense) {
          try {
            await uploadExpenseReceipt(created.expense.id, receiptFile);
          } catch (failure) {
            notify.error(tServer(failure));
          }
        }
        remember({ categoryId: payload.categoryId || '', currency: payload.currency, payKey: extra.payKey, payCustom: extra.payCustom });
        notify.success(t('expenses.addedBody', { amount: formatMoney(payload.amount, { decimals: 2, currency: payload.currency }) }), { title: t('expenses.addedTitle') });
      }
      const target = payload.spentAt.slice(0, 7);
      closePanel();
      loadPeople();
      if (target !== month) setMonth(target);
      else await load(month);
    } catch (error) {
      notify.error(tServer(error), { title: t('expenses.addFailedTitle') });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteExpense(panel.expense.id);
      notify.success(t('expenses.deletedTitle'));
      closePanel();
      loadPeople();
      await load(month);
    } catch (error) {
      notify.error(tServer(error), { title: t('expenses.deleteFailedTitle') });
    } finally {
      setBusy(false);
    }
  };

  const addCategory = async (name, icon = '') => {
    try {
      const { category } = await createExpenseCategory(name, icon);
      setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
      return category;
    } catch (error) {
      notify.error(tServer(error), { title: t('expenses.categoryFailedTitle') });
      return null;
    }
  };

  const updateCategory = async (id, patch) => {
    try {
      const { category } = await updateExpenseCategory(id, patch);
      setCategories((prev) => prev.map((item) => (item.id === id ? category : item)).sort((a, b) => a.name.localeCompare(b.name)));
      return category;
    } catch (error) {
      notify.error(tServer(error), { title: t('expenses.categoryFailedTitle') });
      return null;
    }
  };

  const pickCategory = (id) => {
    setCategoryFilter(id);
    if (id) setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const removeCategory = async (category) => {
    try {
      const result = await deleteExpenseCategory(category.id);
      setCategories((prev) => prev.filter((item) => item.id !== category.id));
      const clear = (list) => list.map((item) => (item.categoryId === category.id ? { ...item, categoryId: null } : item));
      setExpenses(clear);
      setPrevious(clear);
      if (categoryFilter === category.id) setCategoryFilter('');
      notify.success(result && result.moved > 0 ? t('expenses.categoryRemovedMoved', { count: result.moved }) : t('expenses.categoryRemoved'), { title: t('expenses.categoryRemovedTitle') });
    } catch (error) {
      notify.error(tServer(error), { title: t('expenses.categoryFailedTitle') });
    }
  };

  const money = (value, decimals = 0) => formatMoney(value, { decimals, currency });
  const hasMonth = expenses.length > 0;
  const rangeLabels = { all: t('expenses.filterAll'), today: t('expenses.filterToday'), week: t('expenses.filterWeek') };
  const change = stats.change;
  const todayDay = month === nowMonth ? Number(todayKey.slice(8, 10)) : null;

  return (
    <AppShell showLogo pageTitle={t('expenses.title')} items={items} activeId={activeId}>
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('expenses.title')}</h1>
          {canWrite && !loading && hasMonth && (
            <button type="button" onClick={() => setPanel({ mode: 'add' })} className="hidden shrink-0 items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 lg:flex">
              <Plus className="h-4 w-4" />
              {t('expenses.add')}
            </button>
          )}
        </div>
        {capped && <p className="mb-4 rounded-xl bg-surface px-4 py-3 text-sm text-muted">{t('errors.listCapped', { count: 2000 })}</p>}

        {loading ? (
          <ExpensesSkeleton />
        ) : (
          <div className="flex flex-col gap-4">
            <MonthOverview
              month={month}
              label={monthLabel}
              total={stats.total}
              others={others}
              days={stats.days}
              todayDay={todayDay}
              currency={currency}
              perDay={stats.perDay}
              change={change}
              biggest={stats.biggest}
              count={spending.length}
              lent={lentTotal}
              busy={refreshing}
              canNext={month < nowMonth}
              onPrev={() => setMonth(shiftMonth(month, -1))}
              onNext={() => setMonth(shiftMonth(month, 1))}
            />
            {stats.excluded > 0 && <p className="text-xs text-muted">{t('loans.excludedNote', { count: stats.excluded })}</p>}

            {!hasMonth ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted">
                  <Receipt className="h-6 w-6" strokeWidth={1.5} />
                </span>
                <p className="mt-4 text-base font-medium text-ink">{t('expenses.emptyTitle')}</p>
                {canWrite && (
                  <button type="button" onClick={() => setPanel({ mode: 'add' })} className="mt-5 flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
                    <Plus className="h-4 w-4" /> {t('expenses.add')}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div ref={listRef} className="scroll-mt-20" />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div role="group" aria-label={t('expenses.title')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
                    {['all', 'today', 'week'].map((name) => (
                      <button
                        key={name}
                        type="button"
                        aria-pressed={range === name}
                        onClick={() => setRange(name)}
                        className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${
                          range === name ? 'border-ink bg-ink text-white' : 'border-border bg-white text-muted hover:border-ink/30 hover:text-ink'
                        }`}
                      >
                        {rangeLabels[name]}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative block min-w-0 flex-1 sm:w-52 sm:flex-none">
                      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                      <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t('expenses.searchPlaceholder')}
                        aria-label={t('expenses.searchPlaceholder')}
                        className="w-full rounded-lg border border-border bg-white py-2.5 pe-3.5 ps-9 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm"
                      />
                    </label>
                    {rows.length > 0 && <CategoryFilter rows={rows} value={categoryFilter} onChange={pickCategory} money={(value) => money(value)} />}
                  </div>
                </div>

                {categoryFilter && (
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('')}
                    className="-mt-1 flex w-fit max-w-full items-center gap-2 rounded-full bg-ink py-1.5 pe-2 ps-3 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    <CategoryIcon category={byId.get(categoryFilter)} className="h-4 w-4" />
                    <span className="truncate">{nameOf(categoryFilter)}</span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                      <X className="h-3 w-3" strokeWidth={3} />
                    </span>
                  </button>
                )}

                {groups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted">{t('expenses.noMatches')}</div>
                ) : (
                  <div className={`flex flex-col gap-4 transition-opacity ${refreshing ? 'opacity-50' : ''}`}>
                    {groups.map((group) => (
                      <section key={group.key} className="overflow-hidden rounded-2xl border border-border bg-white">
                        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface/60 px-5 py-2.5">
                          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{dayLabel(group.key)}</p>
                          <p className="text-xs font-semibold tabular-nums text-ink">{money(group.total)}</p>
                        </div>
                        <ul>
                          {group.list.map((expense) => (
                            <li key={expense.id} className="border-b border-border last:border-b-0">
                              <button
                                type="button"
                                onClick={() => (expense.billId ? navigate(`/bills?bill=${expense.billId}`) : setPanel({ mode: 'edit', expense }))}
                                className="flex w-full items-center gap-3 px-4 py-3.5 text-start outline-none transition hover:bg-surface/60 focus-visible:bg-surface/60 sm:px-5"
                              >
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
                                  <CategoryIcon category={byId.get(expense.categoryId)} name={nameOf(expense.categoryId)} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[15px] font-semibold text-ink">{nameOf(expense.categoryId)}</span>
                                  <span className="mt-1 flex items-center gap-2">
                                    {expense.billId && <span className="shrink-0 rounded-full border border-ink px-2 py-0.5 text-[11px] font-semibold text-ink">{t('bills.fromBill')}</span>}
                                    {expense.hasReceipt && <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} aria-label={t('expenses.receiptLabel')} />}
                                    {(expense.repeat !== 'none' || expense.repeatOf) && (
                                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink ring-1 ring-border">
                                        <Repeat className="h-3 w-3" strokeWidth={2.25} />
                                        {t('expenses.repeatPill')}
                                      </span>
                                    )}
                                    {expense.paidBy === 'other' && (
                                      <span className="max-w-[55%] shrink-0 truncate rounded-full border border-ink px-2 py-0.5 text-[11px] font-semibold text-ink">{t('expenses.paidByName', { name: expense.payerName })}</span>
                                    )}
                                    {expense.givenTo && (
                                      <span className="max-w-[55%] shrink-0 truncate rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">{t('expenses.givenToName', { name: expense.givenTo })}</span>
                                    )}
                                    <span className="min-w-0 truncate text-sm text-muted">
                                      {[expense.note, expense.paidBy === 'other' ? '' : expense.payMethod === 'cash' ? t('loans.cash') : expense.payName].filter(Boolean).join(' · ') || (expense.paidBy === 'other' ? '' : '-')}
                                    </span>
                                  </span>
                                </span>
                                <span className="shrink-0 text-end text-[15px] font-bold tabular-nums text-ink">
                                  {formatMoney(expense.amount, { decimals: 2, currency: expense.currency })}
                                </span>
                              </button>
                              {(expense.loan || expense.givenTo || expense.paidBy === 'other') && (
                                <div className="px-4 pb-3.5 sm:px-5">
                                  {expense.loan ? (
                                    <Link
                                      to={`/loans?loan=${expense.loan.id}`}
                                      className="ms-[3.25rem] flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs outline-none transition hover:bg-black/[0.06] focus-visible:ring-2 focus-visible:ring-accent/40"
                                    >
                                      <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                                      <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                                        {t('expenses.subLoan', { name: expense.loan.personName })}
                                        {expense.loan.entries > 1 ? ` · ${t('expenses.subEntries', { count: expense.loan.entries })}` : ''}
                                      </span>
                                      <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold tabular-nums ${expense.loan.done ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-border'}`}>
                                        {expense.loan.done
                                          ? t('expenses.statusPaid')
                                          : expense.loan.paid > 0
                                            ? t('expenses.statusPartly', { paid: formatMoney(expense.loan.paid, { decimals: 0, currency: expense.loan.currency }), total: formatMoney(expense.loan.amount, { decimals: 0, currency: expense.loan.currency }) })
                                            : t('expenses.statusOpen', { left: formatMoney(expense.loan.remaining, { decimals: 0, currency: expense.loan.currency }) })}
                                      </span>
                                    </Link>
                                  ) : (
                                    <p className="ms-[3.25rem] flex items-center gap-2 px-1 text-xs text-muted">
                                      <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
                                      {t('expenses.subRemoved')}
                                    </p>
                                  )}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {canWrite && !loading && hasMonth && !panel && (
          <motion.button
            key="add-fab"
            type="button"
            onClick={() => setPanel({ mode: 'add' })}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] end-4 z-30 flex items-center gap-2 rounded-full bg-ink py-3.5 ps-4 pe-5 text-sm font-semibold text-white shadow-[0_14px_30px_-10px_rgba(0,0,0,0.6)] outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-accent/40 lg:hidden"
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.25} />
            {t('expenses.add')}
          </motion.button>
        )}
      </AnimatePresence>

      <Drawer open={Boolean(panel)} onClose={closePanel} title={panel?.mode === 'edit' ? t('expenses.editTitle') : t('expenses.add')} label={t('expenses.add')}>
        {panel && (
          <ExpenseForm
            key={panel.mode === 'edit' ? panel.expense.id : 'add'}
            mode={panel.mode}
            initial={formFor(panel.mode === 'edit' ? panel.expense : null)}
            people={people}
            loans={loans}
            enteredAt={panel.mode === 'edit' ? panel.expense.createdAt : undefined}
            loanId={panel.mode === 'edit' ? panel.expense.loanId : null}
            categories={categories}
            currencies={currencies}
            busy={busy}
            onCancel={closePanel}
            expenseId={panel.mode === 'edit' ? panel.expense.id : null}
            onReceiptChange={() => load(month)}
            onSubmit={(payload, receiptFile) => {
              const form = { payKey: panel.mode === 'add' ? keyFor(payload.payMethod, payload.payName) : '', payCustom: panel.mode === 'add' ? customFor(payload.payMethod, payload.payName) : '' };
              return handleSubmit(payload, form, receiptFile);
            }}
            onDelete={handleDelete}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onRemoveCategory={removeCategory}
          />
        )}
      </Drawer>
    </AppShell>
  );
}

export default ExpensesPage;
