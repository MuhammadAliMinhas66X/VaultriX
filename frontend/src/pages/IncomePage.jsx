import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Archive, ArchiveRestore, Banknote, ChevronDown, Plus } from 'lucide-react';
import { IncomeSkeleton } from '../components/Skeletons.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import IncomeForm, { emptyForm, formFromStream } from '../components/income/IncomeForm.jsx';
import { typeLabelKey } from '../components/income/incomeOptions.js';
import IncomeCard from '../components/income/IncomeCard.jsx';
import IncomeDetail from '../components/income/IncomeDetail.jsx';
import BalanceOverview from '../components/income/BalanceOverview.jsx';
import OpeningBalanceSheet from '../components/income/OpeningBalanceSheet.jsx';
import { useBalance } from '../hooks/useBalance.js';
import { monthKey, shiftMonth } from '../utils/expenseMath.js';
import Drawer from '../components/Drawer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useIncome } from '../context/IncomeContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { notify } from '../i18n/notifications.js';
import { createIncomeStream, updateIncomeStream, deleteIncomeStream } from '../services/incomeStreamService.js';
import { calculateCuts } from '../utils/salaryCuts.js';
import { toBase } from '../utils/incomeMath.js';
import useMediaQuery from '../utils/useMediaQuery.js';

const toPayloadDeductions = (items) =>
  items
    .filter((item) => item.name.trim() && item.value !== '' && Number(item.value) > 0)
    .map((item) => ({ name: item.name.trim(), kind: item.kind, value: Number(item.value) }));

function IncomePage() {
  const { currency } = useAuth();
  const { t, tServer } = useTranslation();
  const { formatMoney } = useFormat();
  const { currencies } = useLocalizedOptions();
  const { streams, archivedStreams, setStreams, loading, load, rates } = useIncome();
  const { items, activeId } = useAppNav();
  const location = useLocation();
  const navigate = useNavigate();
  const wide = useMediaQuery('(min-width: 1280px)');

  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cutsStatus, setCutsStatus] = useState({});
  const [flashId, setFlashId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const currentMonth = monthKey(new Date());
  const [month, setMonth] = useState(currentMonth);
  const [openingOpen, setOpeningOpen] = useState(false);
  const balance = useBalance(month);

  const saveTimers = useRef({});
  const streamsRef = useRef(streams);
  streamsRef.current = streams;

  const selected = useMemo(() => streams.find((item) => item.id === selectedId) || null, [streams, selectedId]);
  const editing = useMemo(() => streams.find((item) => item.id === editingId) || null, [streams, editingId]);

  const focusStream = useCallback((id) => {
    setSelectedId(id);
    setFlashId(id);
    setTimeout(() => document.getElementById(`stream-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    setTimeout(() => setFlashId((prev) => (prev === id ? null : prev)), 1400);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (location.hash.startsWith('#stream-')) {
      const id = location.hash.slice('#stream-'.length);
      if (streamsRef.current.some((item) => item.id === id)) {
        setAdding(false);
        setEditingId(null);
        focusStream(id);
      }
    } else if (new URLSearchParams(location.search).get('add') === '1') {
      setEditingId(null);
      setAdding(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate('/income', { replace: true });
    }
  }, [location.key, loading]);

  useEffect(() => {
    if (wide && !selectedId && !adding && !editingId && streams.length > 0) setSelectedId(streams[0].id);
  }, [wide, streams, selectedId, adding, editingId]);

  const convertedAmount = (stream) => (stream.expectedAmount === null || stream.currency === currency ? null : toBase(stream.expectedAmount, stream.currency, rates));

  const saveCuts = useCallback(
    async (id) => {
      const current = streamsRef.current.find((item) => item.id === id);
      if (!current) return;
      setCutsStatus((prev) => ({ ...prev, [id]: 'saving' }));
      try {
        await updateIncomeStream(id, {
          taxEnabled: Boolean(current.taxEnabled),
          deductionsEnabled: Boolean(current.deductionsEnabled),
          deductFromTotal: Boolean(current.deductFromTotal),
          deductions: toPayloadDeductions(current.deductions || []),
        });
        setCutsStatus((prev) => ({ ...prev, [id]: 'saved' }));
      } catch (error) {
        setCutsStatus((prev) => ({ ...prev, [id]: 'error' }));
        notify.error(tServer(error), { title: t('income.saveFailedTitle') });
        load();
      }
    },
    [load, tServer, t]
  );

  const saveCutsRef = useRef(saveCuts);
  saveCutsRef.current = saveCuts;

  const handleCutsChange = (id, patch, options = {}) => {
    if (patch.deductFromTotal !== undefined && !options.silent) {
      const target = streamsRef.current.find((item) => item.id === id);
      if (target) {
        if (patch.deductFromTotal) {
          const net = calculateCuts({ ...target, ...patch }).netPerPeriod;
          notify.success(t('income.deductedBody', { amount: formatMoney(net, { decimals: 0, currency: target.currency }) }), { title: t('income.deductedTitle') });
        } else {
          notify.info(t('income.undoneBody'), { title: t('income.undoneTitle') });
        }
      }
    }
    setStreams((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => {
      delete saveTimers.current[id];
      saveCutsRef.current(id);
    }, options.immediate ? 60 : 700);
  };

  useEffect(
    () => () => {
      Object.keys(saveTimers.current).forEach((id) => {
        clearTimeout(saveTimers.current[id]);
        saveCutsRef.current(id);
      });
    },
    []
  );

  const startAdding = () => {
    setEditingId(null);
    setAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreate = async (payload) => {
    setBusy(true);
    try {
      await createIncomeStream(payload);
      notify.success(t('income.addedBody', { name: payload.name.trim() }), { title: t('income.addedTitle') });
      setAdding(false);
      await load();
    } catch (error) {
      notify.error(tServer(error), { title: t('income.addFailedTitle') });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (id, payload) => {
    setBusy(true);
    try {
      await updateIncomeStream(id, payload);
      notify.success(t('income.updatedBody', { name: payload.name.trim() }), { title: t('income.updatedTitle') });
      setEditingId(null);
      await load();
    } catch (error) {
      notify.error(tServer(error), { title: t('income.updateFailedTitle') });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (stream) => {
    try {
      await deleteIncomeStream(stream.id);
      notify.success(t('income.deletedBody', { name: stream.name }), { title: t('income.deletedTitle') });
      setSelectedId(null);
      await load();
    } catch (error) {
      notify.error(tServer(error), { title: t('income.deleteFailedTitle') });
    }
  };

  const setArchived = async (stream, archived) => {
    try {
      await updateIncomeStream(stream.id, { isArchived: archived });
      notify.success(t(archived ? 'income.archivedBody' : 'income.restoredBody', { name: stream.name }), { title: t(archived ? 'income.archivedToast' : 'income.restoredToast') });
      if (archived) {
        setSelectedId(null);
        setEditingId(null);
      }
      await load();
    } catch (error) {
      notify.error(tServer(error), { title: t(archived ? 'income.archiveFailedTitle' : 'income.restoreFailedTitle') });
    }
  };

  const addForm = (
    <IncomeForm initial={emptyForm(currency)} currencies={currencies} onCancel={() => setAdding(false)} onSubmit={handleCreate} submitLabel={t('income.save')} busy={busy} />
  );

  const editForm = editing && (
    <IncomeForm
      initial={formFromStream(editing)}
      currencies={currencies}
      onCancel={() => setEditingId(null)}
      onSubmit={(payload) => handleUpdate(editing.id, payload)}
      submitLabel={t('income.save')}
      busy={busy}
    />
  );

  const detailFor = (stream) => (
    <IncomeDetail
      stream={stream}
      currency={currency}
      converted={convertedAmount(stream)}
      onEdit={() => {
        setAdding(false);
        setEditingId(stream.id);
      }}
      onDelete={() => handleDelete(stream)}
      onArchive={() => setArchived(stream, true)}
      onCutsChange={(patch, options) => handleCutsChange(stream.id, patch, options)}
      cutsStatus={cutsStatus[stream.id]}
    />
  );

  const archivedBlock = archivedStreams.length > 0 && (
      
        <div className="rounded-2xl border border-border bg-white">
          <button
            type="button"
            onClick={() => setShowArchived((value) => !value)}
            aria-expanded={showArchived}
            className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Archive className="h-4 w-4 text-muted" strokeWidth={1.75} />
              {t('income.archivedTitle')}
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-muted">{archivedStreams.length}</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-muted transition ${showArchived ? 'rotate-180' : ''}`} />
          </button>
          {showArchived && (
            <div className="border-t border-border">
              <p className="px-4 pt-3 text-xs text-muted">{t('income.archivedHint')}</p>
              <ul className="divide-y divide-border">
                {archivedStreams.map((stream) => (
                  <li key={stream.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{stream.name}</span>
                      <span className="block truncate text-xs text-muted">{t(typeLabelKey(stream.incomeType))}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setArchived(stream, false)}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition hover:border-ink/30 hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <ArchiveRestore className="h-4 w-4" strokeWidth={1.75} /> {t('income.restore')}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
  );

  const sidePanel = adding ? addForm : editing ? editForm : selected ? detailFor(selected) : null;

  return (
    <AppShell showLogo pageTitle={t('income.headerStream')} items={items} activeId={activeId}>
      <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('income.headerStream')}</h1>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-muted ring-1 ring-border">{streams.length}</span>
          </div>
          {!adding && !loading && streams.length > 0 && (
            <button type="button" onClick={startAdding} className="hidden shrink-0 items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 lg:flex">
              <Plus className="h-4 w-4" />
              {t('income.add')}
            </button>
          )}
        </div>

        {!loading && (
          <div className="mb-6">
            <BalanceOverview
              balance={balance}
              month={month}
              canGoNext={month < currentMonth}
              onMonthChange={(delta) => setMonth((prev) => (delta > 0 && prev >= currentMonth ? prev : shiftMonth(prev, delta)))}
              onEditOpening={() => setOpeningOpen(true)}
            />
          </div>
        )}

        {loading ? (
          <IncomeSkeleton />
        ) : streams.length === 0 && !adding ? (
          <>
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted">
              <Banknote className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <p className="mt-4 text-base font-medium text-ink">{t('income.emptyTitle')}</p>
            <button type="button" onClick={startAdding} className="mt-5 flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
              <Plus className="h-4 w-4" /> {t('income.add')}
            </button>
          </div>
          {archivedBlock && <div className="mt-4">{archivedBlock}</div>}
          </>
        ) : (
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-3">
              <ul className="flex flex-col gap-3">
                {streams.map((stream) => (
                  <li key={stream.id} id={`stream-${stream.id}`} className="scroll-mt-20">
                    <IncomeCard
                      stream={stream}
                      selected={selectedId === stream.id}
                      flash={flashId === stream.id}
                      currency={currency}
                      converted={convertedAmount(stream)}
                      onSelect={() => {
                        setAdding(false);
                        setEditingId(null);
                        setSelectedId(stream.id);
                      }}
                    />
                  </li>
                ))}
              </ul>
              {archivedBlock}
            </div>

            {wide && <div className="min-w-0">{sidePanel}</div>}
          </div>
        )}
      </div>
      <AnimatePresence>
        {!wide && !loading && !adding && !editing && !selected && streams.length > 0 && (
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
            {t('income.add')}
          </motion.button>
        )}
      </AnimatePresence>
      <Drawer open={openingOpen} onClose={() => setOpeningOpen(false)} title={t('balance.openingTitle')} label={t('balance.openingTitle')}>
        <OpeningBalanceSheet opening={balance.opening} currency={currency} currencies={currencies} onDone={() => setOpeningOpen(false)} />
      </Drawer>
      <Drawer
        open={!wide && !loading && Boolean(sidePanel)}
        onClose={() => {
          if (adding) setAdding(false);
          else if (editingId) setEditingId(null);
          else setSelectedId(null);
        }}
        title={adding ? t('income.add') : editing ? editing.name : ''}
        label={selected ? selected.name : t('income.add')}
      >
        {sidePanel}
      </Drawer>
    </AppShell>
  );
}

export default IncomePage;
