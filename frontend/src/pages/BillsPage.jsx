import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Receipt, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import Drawer from '../components/Drawer.jsx';
import Combobox from '../components/Combobox.jsx';
import { Bone } from '../components/Skeletons.jsx';
import BillCard from '../components/bills/BillCard.jsx';
import BillDetail from '../components/bills/BillDetail.jsx';
import BillForm, { emptyBillForm, formFromBill } from '../components/bills/BillForm.jsx';
import BillShare from '../components/bills/BillShare.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useIncome } from '../context/IncomeContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { notify } from '../i18n/notifications.js';
import useExpenseCategories from '../hooks/useExpenseCategories.js';
import { listBills, createBill, updateBill, deleteBill, addBillPayment, deleteBillPayment, setBillCancelled, changeBillRecurring } from '../services/billService.js';
import { VIEWS, countByView, matchesView, sortBills, summarizeBills } from '../utils/billMath.js';
import { todayInput } from '../utils/dates.js';

const REMEMBER_KEY = 'vaultrix.lastBill';

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

const VIEW_KEY = {
  all: 'bills.viewAll',
  upcoming: 'bills.viewUpcoming',
  unpaid: 'bills.viewUnpaid',
  overdue: 'bills.viewOverdue',
  partial: 'bills.viewPartial',
  paid: 'bills.viewPaid',
  cancelled: 'bills.viewCancelled',
};

function Stat({ label, value, sub, strong = false }) {
  return (
    <div className={`flex min-w-0 flex-col justify-between rounded-2xl border p-4 ${strong ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink'}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${strong ? 'text-white/65' : 'text-muted'}`}>{label}</p>
      <p className="mt-2 break-words text-xl font-bold leading-tight tracking-tight tabular-nums sm:text-2xl">{value}</p>
      <p className={`mt-1 min-h-[1rem] text-xs ${strong ? 'text-white/65' : 'text-muted'}`}>{sub}</p>
    </div>
  );
}

function BillsPage() {
  const { currency } = useAuth();
  const { t, tServer } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const { currencies } = useLocalizedOptions();
  const { rates } = useIncome();
  const { items, activeId } = useAppNav();
  const { categories, byId, nameOf, addCategory, updateCategory, removeCategory } = useExpenseCategories();
  const location = useLocation();
  const navigate = useNavigate();

  const today = todayInput();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('all');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [panel, setPanel] = useState(null);
  const [share, setShare] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const linkHandled = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await listBills(todayInput());
      setBills(data.bills);
      return data.bills;
    } catch (error) {
      notify.error(tServer(error));
      return null;
    } finally {
      setLoading(false);
    }
  }, [tServer]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading || linkHandled.current) return;
    const params = new URLSearchParams(location.search);
    if (!params.toString()) return;
    linkHandled.current = true;
    const wanted = params.get('view');
    if (VIEWS.includes(wanted)) setView(wanted);
    const id = params.get('bill');
    if (id && bills.some((bill) => bill.id === id)) setPanel({ mode: 'detail', id, pay: params.get('pay') === '1' });
    else if (params.get('add') === '1') setPanel({ mode: 'add' });
    navigate('/bills', { replace: true });
  }, [loading, location.search, bills, navigate]);

  const counts = useMemo(() => countByView(bills, today), [bills, today]);
  const summary = useMemo(() => (rates ? summarizeBills(bills, rates, currency, today) : null), [bills, rates, currency, today]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = bills.filter((bill) => {
      if (!matchesView(bill, view, today)) return false;
      if (categoryFilter && (bill.categoryId || '') !== categoryFilter) return false;
      if (needle && !`${bill.billerName} ${bill.billerAccount} ${bill.note}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    return sortBills(list, view, today);
  }, [bills, view, query, categoryFilter, today]);

  const selected = panel && panel.id ? bills.find((bill) => bill.id === panel.id) || null : null;
  const siblings = useMemo(
    () => (selected ? bills.filter((bill) => bill.seriesId === selected.seriesId && bill.id !== selected.id).sort((a, b) => String(b.dueAt).localeCompare(String(a.dueAt))).slice(0, 6) : []),
    [bills, selected]
  );

  const money = (value) => formatMoney(value, { decimals: 0, currency });
  const categoryItems = useMemo(
    () => [{ value: '', label: t('bills.allCategories') }, ...categories.map((category) => ({ value: category.id, label: category.name }))],
    [categories, t]
  );

  const replaceBill = (bill) => setBills((prev) => (prev.some((item) => item.id === bill.id) ? prev.map((item) => (item.id === bill.id ? bill : item)) : [...prev, bill]));
  const closePanel = () => setPanel(null);

  const handleCreate = async (payload, extra) => {
    setBusy(true);
    try {
      const { bill } = await createBill(payload);
      remember({ categoryId: payload.categoryId || '', currency: payload.currency, payKey: extra.payKey, payCustom: extra.payCustom });
      replaceBill(bill);
      notify.success(t('bills.addedTitle'));
      setPanel({ mode: 'detail', id: bill.id });
    } catch (error) {
      notify.error(tServer(error), { title: t('bills.addFailedTitle') });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (payload) => {
    setBusy(true);
    try {
      const { bill } = await updateBill(selected.id, payload);
      await load();
      notify.success(t('bills.updatedTitle'));
      setPanel({ mode: 'detail', id: bill.id });
    } catch (error) {
      notify.error(tServer(error), { title: t('bills.addFailedTitle') });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBill(selected.id);
      setBills((prev) => prev.filter((bill) => bill.id !== selected.id));
      notify.success(t('bills.deletedTitle'));
      closePanel();
    } catch (error) {
      notify.error(tServer(error), { title: t('bills.deleteFailedTitle') });
    }
  };

  const handlePay = async (payload) => {
    setPaymentBusy(true);
    try {
      const { bill } = await addBillPayment(selected.id, payload);
      replaceBill(bill);
      notify.success(t('bills.paymentAddedBody', { amount: formatMoney(payload.amount, { decimals: 2, currency: bill.currency }) }), { title: t('bills.paymentAddedTitle') });
      return true;
    } catch (error) {
      notify.error(tServer(error), { title: t('bills.paymentFailedTitle') });
      return false;
    } finally {
      setPaymentBusy(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    try {
      const { bill } = await deleteBillPayment(selected.id, paymentId);
      replaceBill(bill);
      notify.success(t('bills.paymentDeletedTitle'));
    } catch (error) {
      notify.error(tServer(error), { title: t('bills.paymentFailedTitle') });
    }
  };

  const handleToggleCancel = async () => {
    const next = !selected.cancelledAt;
    try {
      const { bill } = await setBillCancelled(selected.id, next);
      replaceBill(bill);
      notify.success(next ? t('bills.cancelledTitle') : t('bills.reopenedTitle'));
    } catch (error) {
      notify.error(tServer(error), { title: t('bills.addFailedTitle') });
    }
  };

  const handleRecurring = async (action) => {
    try {
      await changeBillRecurring(selected.id, action, todayInput());
      await load();
      notify.success(t(action === 'pause' ? 'bills.recurringPausedTitle' : action === 'resume' ? 'bills.recurringResumedTitle' : 'bills.recurringStoppedTitle'));
    } catch (error) {
      notify.error(tServer(error), { title: t('bills.addFailedTitle') });
    }
  };

  const hasBills = bills.length > 0;
  const nextText = summary?.nextRecurring ? formatDate(new Date(`${summary.nextRecurring.key}T00:00:00Z`), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : t('bills.none');

  const drawerTitle = panel?.mode === 'add' ? t('bills.add') : panel?.mode === 'edit' ? t('bills.editTitle') : selected ? selected.billerName : t('bills.title');

  return (
    <AppShell showLogo pageTitle={t('bills.title')} items={items} activeId={activeId}>
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('bills.title')}</h1>
          {!loading && hasBills && (
            <button type="button" onClick={() => setPanel({ mode: 'add' })} className="hidden shrink-0 items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 lg:flex">
              <Plus className="h-4 w-4" />
              {t('bills.add')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-4" aria-busy="true">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((key) => (
                <span key={key} className="block h-[104px] animate-pulse rounded-2xl bg-border/60 motion-reduce:animate-none" />
              ))}
            </div>
            {[0, 1, 2].map((key) => (
              <div key={key} className="flex items-center gap-3.5 rounded-2xl border border-border bg-white p-4">
                <Bone className="h-12 w-12 rounded-lg" />
                <div className="flex flex-1 flex-col gap-2">
                  <Bone className="h-3.5 w-32" />
                  <Bone className="h-3 w-20" />
                </div>
                <Bone className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : !hasBills ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted">
              <Receipt className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <p className="mt-4 max-w-sm text-base font-medium text-ink">{t('bills.emptyTitle')}</p>
            <button type="button" onClick={() => setPanel({ mode: 'add' })} className="mt-5 flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
              <Plus className="h-4 w-4" /> {t('bills.add')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat strong label={t('bills.statOutstanding')} value={summary ? money(summary.unpaidTotal) : '-'} sub={summary ? t('bills.statUnpaidCount', { count: summary.unpaidCount }) : ''} />
              <Stat label={t('bills.statDueToday')} value={summary ? String(summary.dueTodayCount) : '-'} sub={summary && summary.dueTodayCount > 0 ? money(summary.dueTodayTotal) : ''} />
              <Stat label={t('bills.statOverdue')} value={summary ? String(summary.overdueCount) : '-'} sub={summary && summary.overdueCount > 0 ? money(summary.overdueTotal) : ''} />
              <Stat label={t('bills.statPaidMonth')} value={summary ? money(summary.paidMonthTotal) : '-'} sub={summary ? t('bills.statPaidCount', { count: summary.paidMonthCount }) : ''} />
            </div>
            {summary && summary.excluded > 0 && <p className="text-xs text-muted">{t('loans.excludedNote', { count: summary.excluded })}</p>}
            <p className="-mt-1 text-xs text-muted">{t('bills.nextRecurringLine', { date: nextText })}</p>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div role="tablist" aria-label={t('bills.title')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
                {VIEWS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="tab"
                    aria-selected={view === name}
                    onClick={() => setView(name)}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${
                      view === name ? 'border-ink bg-ink text-white' : 'border-border bg-white text-muted hover:border-ink/30 hover:text-ink'
                    }`}
                  >
                    {t(VIEW_KEY[name])}
                    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${view === name ? 'bg-white/20 text-white' : 'bg-surface text-muted'}`}>{counts[name]}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="sm:w-48">
                  <Combobox items={categoryItems} ariaLabel={t('bills.categoryLabel')} placeholder={t('bills.allCategories')} searchPlaceholder={t('common.search')} value={categoryFilter} onChange={setCategoryFilter} />
                </div>
                <label className="relative block sm:w-52">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('bills.searchPlaceholder')}
                    aria-label={t('bills.searchPlaceholder')}
                    className="w-full rounded-lg border border-border bg-white py-2.5 pe-3.5 ps-9 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm"
                  />
                </label>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted">{t('bills.noMatches')}</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {filtered.map((bill) => (
                  <BillCard key={bill.id} bill={bill} today={today} category={byId.get(bill.categoryId)} categoryName={nameOf(bill.categoryId)} onSelect={() => setPanel({ mode: 'detail', id: bill.id })} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {!loading && hasBills && !panel && (
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
            {t('bills.add')}
          </motion.button>
        )}
      </AnimatePresence>

      <Drawer open={Boolean(panel) && (panel.mode === 'add' || Boolean(selected))} onClose={closePanel} title={drawerTitle} label={drawerTitle}>
        {panel?.mode === 'add' && (
          <BillForm
            key="add"
            mode="add"
            initial={emptyBillForm(currency, readRemembered(), categories)}
            categories={categories}
            currencies={currencies}
            busy={busy}
            onCancel={closePanel}
            onSubmit={handleCreate}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onRemoveCategory={removeCategory}
          />
        )}
        {panel?.mode === 'edit' && selected && (
          <BillForm
            key={`edit-${selected.id}`}
            mode="edit"
            bill={selected}
            initial={formFromBill(selected)}
            categories={categories}
            currencies={currencies}
            busy={busy}
            onCancel={() => setPanel({ mode: 'detail', id: selected.id })}
            onSubmit={handleUpdate}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onRemoveCategory={removeCategory}
          />
        )}
        {panel?.mode === 'detail' && selected && (
          <BillDetail
            key={selected.id}
            bill={selected}
            today={today}
            category={byId.get(selected.categoryId)}
            categoryName={nameOf(selected.categoryId)}
            siblings={siblings}
            paymentBusy={paymentBusy}
            autoPay={panel.pay}
            onEdit={() => setPanel({ mode: 'edit', id: selected.id })}
            onShare={() => setShare(selected)}
            onPay={handlePay}
            onDeletePayment={handleDeletePayment}
            onToggleCancel={handleToggleCancel}
            onDelete={handleDelete}
            onRecurring={handleRecurring}
            onOpenBill={(id) => setPanel({ mode: 'detail', id })}
          />
        )}
      </Drawer>

      {share && <BillShare bill={bills.find((bill) => bill.id === share.id) || share} categoryName={nameOf(share.categoryId)} today={today} onClose={() => setShare(null)} />}
    </AppShell>
  );
}

export default BillsPage;
