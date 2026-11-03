import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HandCoins, Plus, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import Drawer from '../components/Drawer.jsx';
import LoanForm, { emptyLoanForm, formFromLoan } from '../components/loans/LoanForm.jsx';
import LoanCard from '../components/loans/LoanCard.jsx';
import LoanDetail from '../components/loans/LoanDetail.jsx';
import { LoansSkeleton } from '../components/Skeletons.jsx';
import LoansOverview from '../components/loans/LoansOverview.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useIncome } from '../context/IncomeContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { notify } from '../i18n/notifications.js';
import {
  listLoans,
  createLoan,
  updateLoan,
  deleteLoan,
  addLoanPayment,
  deleteLoanPayment,
  uploadReceivedProof,
  removeReceivedProof,
  uploadPaymentProof,
  removePaymentProof,
} from '../services/loanService.js';
import { toBase } from '../utils/incomeMath.js';
import { FILTERS, countByFilter, matchesFilter, sortLoans, summarizeLoans, todayDayNumber } from '../utils/loanMath.js';
import useMediaQuery from '../utils/useMediaQuery.js';

function LoansPage() {
  const { currency } = useAuth();
  const { t, tServer } = useTranslation();
  const { formatMoney } = useFormat();
  const { currencies } = useLocalizedOptions();
  const { rates } = useIncome();
  const { items, activeId } = useAppNav();
  const wide = useMediaQuery('(min-width: 1280px)');

  const location = useLocation();
  const openedFromLink = useRef(false);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('borrowed');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await listLoans();
      setLoans(result.loans);
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const replaceLoan = (loan) =>
    setLoans((prev) => (prev.some((item) => item.id === loan.id) ? prev.map((item) => (item.id === loan.id ? loan : item)) : [loan, ...prev]));

  useEffect(() => {
    if (openedFromLink.current || loading) return;
    const id = new URLSearchParams(location.search).get('loan');
    const target = id ? loans.find((loan) => loan.id === id) : null;
    if (!target) return;
    openedFromLink.current = true;
    setTab(target.direction);
    setSelectedId(target.id);
  }, [loading, loans, location.search]);

  const today = todayDayNumber();
  const inTab = useMemo(() => loans.filter((loan) => loan.direction === tab), [loans, tab]);
  const counts = useMemo(() => countByFilter(inTab, today), [inTab, today]);
  const summary = useMemo(() => summarizeLoans(inTab, rates, currency), [inTab, rates, currency]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = inTab.filter((loan) => matchesFilter(loan, filter, today) && (!needle || loan.personName.toLowerCase().includes(needle)));
    return sortLoans(list, filter, today);
  }, [inTab, filter, query, today]);

  const selected = useMemo(() => loans.find((loan) => loan.id === selectedId) || null, [loans, selectedId]);
  const editing = useMemo(() => loans.find((loan) => loan.id === editingId) || null, [loans, editingId]);
  const tabCounts = useMemo(
    () => ({ borrowed: loans.filter((loan) => loan.direction === 'borrowed').length, lent: loans.filter((loan) => loan.direction === 'lent').length }),
    [loans]
  );

  useEffect(() => {
    if (!wide || adding || editingId) return;
    if (!selectedId || !filtered.some((loan) => loan.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [wide, filtered, selectedId, adding, editingId]);

  const convertedLeft = (loan) => (loan.currency === currency || loan.done ? null : toBase(loan.remaining, loan.currency, rates));

  const switchTab = (next) => {
    setTab(next);
    setFilter('all');
    setQuery('');
    setSelectedId(null);
    setAdding(false);
    setEditingId(null);
  };

  const startAdding = () => {
    setEditingId(null);
    setAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreate = async (payload, file) => {
    setBusy(true);
    try {
      const { loan } = await createLoan(payload);
      let latest = loan;
      if (file) {
        try {
          const uploaded = await uploadReceivedProof(loan.id, file);
          latest = uploaded.loan;
        } catch (error) {
          notify.warning(t('loans.photoFailedBody'), { title: t('loans.photoFailedTitle') });
        }
      }
      replaceLoan(latest);
      setTab(payload.direction);
      setFilter('all');
      setQuery('');
      setSelectedId(latest.id);
      setAdding(false);
      notify.success(t('loans.addedBody', { name: latest.personName }), { title: t('loans.addedTitle') });
    } catch (error) {
      notify.error(tServer(error), { title: t('loans.addFailedTitle') });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (id, payload) => {
    setBusy(true);
    try {
      const { loan } = await updateLoan(id, payload);
      replaceLoan(loan);
      if (loan.direction !== tab) {
        setTab(loan.direction);
        setFilter('all');
      }
      setSelectedId(loan.id);
      setEditingId(null);
      notify.success(t('loans.updatedBody', { name: loan.personName }), { title: t('loans.updatedTitle') });
    } catch (error) {
      notify.error(tServer(error), { title: t('loans.updateFailedTitle') });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (loan) => {
    try {
      await deleteLoan(loan.id);
      setLoans((prev) => prev.filter((item) => item.id !== loan.id));
      setSelectedId(null);
      notify.success(t('loans.deletedBody', { name: loan.personName }), { title: t('loans.deletedTitle') });
    } catch (error) {
      notify.error(tServer(error), { title: t('loans.deleteFailedTitle') });
    }
  };

  const handleAddPayment = async (loan, payload, file) => {
    setPaymentBusy(true);
    try {
      const result = await addLoanPayment(loan.id, payload);
      let latest = result.loan;
      if (file) {
        try {
          const uploaded = await uploadPaymentProof(loan.id, result.paymentId, file);
          latest = uploaded.loan;
        } catch (error) {
          notify.warning(t('loans.photoFailedBody'), { title: t('loans.photoFailedTitle') });
        }
      }
      replaceLoan(latest);
      if (latest.done) {
        notify.success(t('loans.doneBody', { name: latest.personName }), { title: t('loans.doneTitle') });
      } else {
        notify.success(t('loans.paymentAddedBody', { amount: formatMoney(payload.amount, { decimals: 0, maxDecimals: 4, currency: loan.currency }) }), { title: t('loans.paymentAddedTitle') });
      }
      return true;
    } catch (error) {
      notify.error(tServer(error), { title: t('loans.paymentFailedTitle') });
      return false;
    } finally {
      setPaymentBusy(false);
    }
  };

  const handleDeletePayment = async (loan, paymentId) => {
    try {
      const { loan: latest } = await deleteLoanPayment(loan.id, paymentId);
      replaceLoan(latest);
      notify.info(t('loans.paymentDeletedBody'), { title: t('loans.paymentDeletedTitle') });
    } catch (error) {
      notify.error(tServer(error), { title: t('loans.paymentFailedTitle') });
    }
  };

  const runPhoto = async (key, action, successTitle) => {
    setUploadingKey(key);
    try {
      const { loan } = await action();
      replaceLoan(loan);
      notify.success(successTitle);
    } catch (error) {
      notify.error(tServer(error), { title: t('loans.photoFailedTitle') });
    } finally {
      setUploadingKey(null);
    }
  };

  const detailFor = (loan) => (
    <LoanDetail
      loan={loan}
      currency={currency}
      converted={convertedLeft(loan)}
      paymentBusy={paymentBusy}
      uploadingKey={uploadingKey}
      onEdit={() => {
        setAdding(false);
        setEditingId(loan.id);
      }}
      onDelete={() => handleDelete(loan)}
      onAddPayment={(payload, file) => handleAddPayment(loan, payload, file)}
      onDeletePayment={(paymentId) => handleDeletePayment(loan, paymentId)}
      onUploadReceived={(file) => runPhoto('received', () => uploadReceivedProof(loan.id, file), t('loans.photoSavedTitle'))}
      onRemoveReceived={() => runPhoto('received', () => removeReceivedProof(loan.id), t('loans.photoRemovedTitle'))}
      onUploadPaymentProof={(paymentId, file) => runPhoto(`payment:${paymentId}`, () => uploadPaymentProof(loan.id, paymentId, file), t('loans.photoSavedTitle'))}
      onRemovePaymentProof={(paymentId) => runPhoto(`payment:${paymentId}`, () => removePaymentProof(loan.id, paymentId), t('loans.photoRemovedTitle'))}
    />
  );

  const addForm = (
    <LoanForm key="add" mode="create" initial={emptyLoanForm(tab, currency)} currencies={currencies} onCancel={() => setAdding(false)} onSubmit={handleCreate} busy={busy} />
  );

  const editForm = editing && (
    <LoanForm
      key={editing.id}
      mode="edit"
      initial={formFromLoan(editing)}
      enteredAt={editing.createdAt}
      paid={editing.paid}
      firstPaymentOn={editing.payments[0]?.paidAt}
      currencies={currencies}
      onCancel={() => setEditingId(null)}
      onSubmit={(payload) => handleUpdate(editing.id, payload)}
      busy={busy}
    />
  );

  const sidePanel = adding ? addForm : editing ? editForm : selected ? detailFor(selected) : null;
  const leftLabel = tab === 'borrowed' ? t('loans.leftToPay') : t('loans.leftToGet');
  const filterLabels = { all: t('loans.filterAll'), open: t('loans.filterOpen'), done: t('loans.filterDone'), critical: t('loans.filterCritical') };
  const exactMoney = inTab.every((loan) => loan.currency === currency);
  const money = useCallback((value) => formatMoney(value, { decimals: 0, maxDecimals: exactMoney ? 4 : 2 }), [formatMoney, exactMoney]);

  const tabs = [
    { id: 'borrowed', label: t('loans.tabOwe'), count: tabCounts.borrowed },
    { id: 'lent', label: t('loans.tabOwed'), count: tabCounts.lent },
  ];

  return (
    <AppShell showLogo pageTitle={t('loans.title')} items={items} activeId={activeId}>
      <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('loans.title')}</h1>
          {!adding && !loading && inTab.length > 0 && (
            <button type="button" onClick={startAdding} className="hidden shrink-0 items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 lg:flex">
              <Plus className="h-4 w-4" />
              {t('loans.add')}
            </button>
          )}
        </div>

        <div role="tablist" aria-label={t('loans.title')} className="mb-5 grid max-w-md grid-cols-2 gap-1 rounded-xl bg-white p-1 ring-1 ring-border">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchTab(item.id)}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${active ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
              >
                {item.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-surface text-muted'}`}>{item.count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <LoansSkeleton />
        ) : inTab.length === 0 ? (
          adding ? (
            wide ? (
              addForm
            ) : null
          ) : (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted">
                <HandCoins className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <p className="mt-4 text-base font-medium text-ink">{t('loans.emptyTitle')}</p>
              <button type="button" onClick={startAdding} className="mt-5 flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
                <Plus className="h-4 w-4" /> {t('loans.add')}
              </button>
            </div>
          )
        ) : (
          <>
            <LoansOverview loans={inTab} rates={rates} currency={currency} summary={summary} leftLabel={leftLabel} money={money} />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div role="group" aria-label={t('loans.filterLabel')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
                {FILTERS.map((name) => {
                  const active = filter === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(name)}
                      className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${
                        active ? 'border-ink bg-ink text-white' : 'border-border bg-white text-muted hover:border-ink/30 hover:text-ink'
                      }`}
                    >
                      {filterLabels[name]}
                      <span className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-surface text-muted'}`}>{counts[name]}</span>
                    </button>
                  );
                })}
              </div>
              <label className="relative block sm:w-60">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('loans.searchPlaceholder')}
                  aria-label={t('loans.searchPlaceholder')}
                  className="w-full rounded-full border border-border bg-white py-2 pe-3.5 ps-9 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm"
                />
              </label>
            </div>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-3">
                {filtered.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted">{t('loans.noMatches')}</div>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {filtered.map((loan) => (
                      <li key={loan.id}>
                        <LoanCard
                          loan={loan}
                          selected={selectedId === loan.id}
                          currency={currency}
                          converted={convertedLeft(loan)}
                          onSelect={() => {
                            setAdding(false);
                            setEditingId(null);
                            setSelectedId(loan.id);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {wide && <div className="min-w-0">{sidePanel}</div>}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {!wide && !loading && !adding && !editing && !selected && inTab.length > 0 && (
          <motion.button
            key="add-fab"
            type="button"
            onClick={startAdding}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] end-4 z-30 flex items-center gap-2 rounded-full bg-ink py-3.5 ps-4 pe-5 text-sm font-semibold text-white shadow-[0_14px_30px_-10px_rgba(0,0,0,0.6)] outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-accent/40 lg:hidden"
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.25} />
            {t('loans.add')}
          </motion.button>
        )}
      </AnimatePresence>

      <Drawer
        open={!wide && !loading && Boolean(sidePanel)}
        onClose={() => {
          if (adding) setAdding(false);
          else if (editingId) setEditingId(null);
          else setSelectedId(null);
        }}
        title={adding ? t('loans.add') : editing ? editing.personName : ''}
        label={selected ? selected.personName : t('loans.add')}
      >
        {sidePanel}
      </Drawer>
    </AppShell>
  );
}

export default LoansPage;
