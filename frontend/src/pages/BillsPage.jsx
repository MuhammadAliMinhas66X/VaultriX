import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Receipt, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import Drawer from '../components/Drawer.jsx';
import { Bone } from '../components/Skeletons.jsx';
import BillRow from '../components/bills/BillRow.jsx';
import BillsSummary from '../components/bills/BillsSummary.jsx';
import BillFilter from '../components/bills/BillFilter.jsx';
import BillDetail from '../components/bills/BillDetail.jsx';
import BillForm, { emptyBillForm, formFromBill } from '../components/bills/BillForm.jsx';
import BillShare from '../components/bills/BillShare.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useIncome } from '../context/IncomeContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { notify } from '../i18n/notifications.js';
import { useAppReducedMotion } from '../hooks/useMotionPreference.js';
import useExpenseCategories from '../hooks/useExpenseCategories.js';
import { createBill, updateBill, deleteBill, addBillPayment, deleteBillPayment, setBillCancelled, changeBillRecurring } from '../services/billService.js';
import { VIEWS, countByView, groupBills, matchesView, sortBills, summarizeBills } from '../utils/billMath.js';
import { addPeriods } from '../utils/billDates.js';
import { todayInput } from '../utils/dates.js';
import { readLastPrefs, rememberBill } from '../utils/billPrefs.js';
import { useResource } from '../data/useResource.js';

const VIEW_KEY = {
  all: 'bills.viewAll',
  upcoming: 'bills.viewUpcoming',
  unpaid: 'bills.viewUnpaid',
  overdue: 'bills.viewOverdue',
  partial: 'bills.viewPartial',
  paid: 'bills.viewPaid',
  cancelled: 'bills.viewCancelled',
};

// "Add again": the same bill, one period later, ready to save.
const similarForm = (bill) => ({
  ...formFromBill(bill),
  dueAt: addPeriods(String(bill.dueAt).slice(0, 10), bill.frequency !== 'none' ? bill.frequency : 'monthly', 1),
  note: '',
  installation: '',
});

const SECTION_KEY = {
  overdue: 'bills.secOverdue',
  today: 'bills.secToday',
  soon: 'bills.secSoon',
  later: 'bills.secLater',
  paid: 'bills.secPaid',
  cancelled: 'bills.secCancelled',
};

const NO_BILLS = [];

function BillsPage() {
  const { currency } = useAuth();
  const reduced = useAppReducedMotion();
  const { t, tServer } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const { currencies } = useLocalizedOptions();
  const { rates, streams } = useIncome();
  const { items, activeId } = useAppNav();
  const { categories, byId, nameOf, addCategory } = useExpenseCategories();
  const location = useLocation();
  const navigate = useNavigate();

  const today = todayInput();
  const [view, setView] = useState('all');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [panel, setPanel] = useState(null);
  const [share, setShare] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [addRound, setAddRound] = useState(0);
  const linkHandled = useRef(false);

  const { data: billsData, loading, reload, update: updateBillsData } = useResource('bills', { today }, { onError: (error) => notify.error(tServer(error)) });
  const bills = billsData ? billsData.bills : NO_BILLS;

  const load = useCallback(async () => {
    const data = await reload();
    return data ? data.bills : null;
  }, [reload]);

  const setBills = useCallback((updater) => updateBillsData((prev) => ({ ...(prev || {}), bills: updater(prev ? prev.bills : NO_BILLS) })), [updateBillsData]);

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

  const preferredCurrencies = useMemo(
    () => [...new Set([currency, ...streams.map((item) => item.currency), ...bills.map((bill) => bill.currency)].filter(Boolean))],
    [currency, streams, bills]
  );

  const money = (value) => formatMoney(value, { decimals: 0, currency });
  const groups = useMemo(() => groupBills(filtered, today), [filtered, today]);

  const replaceBill = (bill) => setBills((prev) => (prev.some((item) => item.id === bill.id) ? prev.map((item) => (item.id === bill.id ? bill : item)) : [...prev, bill]));
  const closePanel = () => setPanel(null);

  const handleCreate = async (payload, extra, another, payNow) => {
    setBusy(true);
    try {
      let { bill } = await createBill(payload);
      rememberBill(extra.prefKey || '', extra);
      replaceBill(bill);
      if (payNow) {
        try {
          const paid = await addBillPayment(bill.id, { amount: bill.remaining, paidAt: todayInput(), payMethod: payload.payMethod, payName: payload.payName, note: '' });
          bill = paid.bill;
          replaceBill(bill);
        } catch (error) {
          notify.error(tServer(error), { title: t('bills.paidNowFailed') });
          payNow = false;
        }
      }
      if (another) {
        notify.success(t(payNow ? 'bills.savedPaidNext' : 'bills.savedNext'), { title: t('bills.addedTitle') });
        setAddRound((round) => round + 1);
      } else {
        notify.success(payNow ? t('bills.addedPaidTitle') : t('bills.addedTitle'));
        setPanel({ mode: 'detail', id: bill.id });
      }
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
            {summary ? <BillsSummary summary={summary} money={money} /> : null}
            {summary && summary.excluded > 0 && <p className="text-xs text-muted">{t('loans.excludedNote', { count: summary.excluded })}</p>}

            <div className="flex items-center gap-2.5">
              <label className="relative block min-w-0 flex-1">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('bills.searchPlaceholder')}
                  aria-label={t('bills.searchPlaceholder')}
                  className="h-[46px] w-full rounded-xl border border-border bg-white pe-3.5 ps-10 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:h-[44px] sm:text-sm"
                />
              </label>
              <BillFilter
                views={VIEWS}
                viewLabel={(name) => t(VIEW_KEY[name])}
                counts={counts}
                view={view}
                onView={setView}
                categories={categories}
                category={categoryFilter}
                onCategory={setCategoryFilter}
                resultCount={filtered.length}
              />
            </div>

            {(view !== 'all' || categoryFilter) && (
              <div className="-mt-1 flex flex-wrap items-center gap-2">
                {view !== 'all' && (
                  <button type="button" onClick={() => setView('all')} className="flex items-center gap-1.5 rounded-full bg-ink py-1.5 pe-2.5 ps-3.5 text-xs font-semibold text-white outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-accent/50">
                    {t(VIEW_KEY[view])} <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {categoryFilter && (
                  <button type="button" onClick={() => setCategoryFilter('')} className="flex items-center gap-1.5 rounded-full bg-ink py-1.5 pe-2.5 ps-3.5 text-xs font-semibold text-white outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-accent/50">
                    {nameOf(categoryFilter)} <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {groups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted">{t('bills.noMatches')}</div>
            ) : (
              <div className="flex flex-col gap-6">
                {groups.map((group, groupIndex) => (
                  <motion.section
                    key={group.key}
                    initial={reduced ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: reduced ? 0 : 0.2 + groupIndex * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    aria-label={t(SECTION_KEY[group.key])}
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                        {t(SECTION_KEY[group.key])}
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted ring-1 ring-border">{group.bills.length}</span>
                      </h2>
                      {group.currency && <span className="text-xs tabular-nums text-muted">{formatMoney(group.total, { decimals: 0, currency: group.currency })}</span>}
                    </div>
                    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
                      <AnimatePresence initial={false}>
                        {group.bills.map((bill) => (
                          <motion.div key={bill.id} layout="position" exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                            <BillRow
                              bill={bill}
                              today={today}
                              categoryName={bill.categoryId ? nameOf(bill.categoryId) : ''}
                              onSelect={() => setPanel({ mode: 'detail', id: bill.id })}
                              onPay={() => setPanel({ mode: 'detail', id: bill.id, pay: true })}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.section>
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
            key={`add-${addRound}-${panel.template ? panel.template.id : ''}`}
            mode="add"
            initial={panel.template ? similarForm(panel.template) : emptyBillForm(currency, readLastPrefs(), categories)}
            preferredCurrencies={preferredCurrencies}
            categories={categories}
            currencies={currencies}
            busy={busy}
            onCancel={closePanel}
            onSubmit={handleCreate}
            onAddCategory={addCategory}
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
            preferredCurrencies={preferredCurrencies}
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
            onAddSimilar={() => setPanel({ mode: 'add', template: selected })}
          />
        )}
      </Drawer>

      {share && <BillShare bill={bills.find((bill) => bill.id === share.id) || share} categoryName={nameOf(share.categoryId)} today={today} onClose={() => setShare(null)} />}
    </AppShell>
  );
}

export default BillsPage;
