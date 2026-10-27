import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, ChevronDown, LayoutDashboard, Plus, ShieldCheck } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import { ADMIN_EMAIL } from '../components/RequireAdmin.jsx';
import IncomeForm, { emptyForm, formFromStream } from '../components/income/IncomeForm.jsx';
import IncomeRow from '../components/income/IncomeRow.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { notify } from '../i18n/notifications.js';
import {
  listIncomeStreams,
  createIncomeStream,
  updateIncomeStream,
  deleteIncomeStream,
} from '../services/incomeStreamService.js';
import { getExchangeRates } from '../services/fxService.js';
import { amountForTotal, calculateCuts } from '../utils/salaryCuts.js';

const toPayloadDeductions = (items) =>
  items
    .filter((item) => item.name.trim() && item.value !== '' && Number(item.value) >= 0)
    .map((item) => ({ name: item.name.trim(), kind: item.kind, value: Number(item.value) }));

function DashboardPage() {
  const { user, currency } = useAuth();
  const { t, tServer } = useTranslation();
  const { formatMoney, formatNumber, formatDate } = useFormat();
  const { currencies } = useLocalizedOptions();

  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cutsStatus, setCutsStatus] = useState({});
  const listRef = useRef(null);
  const saveTimers = useRef({});
  const streamsRef = useRef([]);
  streamsRef.current = streams;

  const [rates, setRates] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesStale, setRatesStale] = useState(false);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(null);
  const [ratesLive, setRatesLive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listIncomeStreams();
      setStreams(result.incomeStreams);
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const neededSymbols = useMemo(
    () => [...new Set(streams.filter((st) => st.expectedAmount !== null).map((st) => st.currency))].filter((code) => code !== currency).sort().join(','),
    [streams, currency]
  );

  useEffect(() => {
    if (!currency) {
      setRatesLoading(false);
      return undefined;
    }
    let cancelled = false;
    setRatesLoading(true);
    getExchangeRates(currency, neededSymbols ? neededSymbols.split(',') : [])
      .then((data) => {
        if (cancelled) return;
        setRates(data.rates);
        setRatesStale(Boolean(data.stale));
        setRatesUpdatedAt(data.updatedAt || data.fetchedAt || null);
        setRatesLive(Array.isArray(data.live) && data.live.length > 0);
      })
      .catch(() => {
        if (!cancelled) setRates(null);
      })
      .finally(() => {
        if (!cancelled) setRatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currency, neededSymbols]);

  const anyNet = useMemo(() => streams.some((st) => st.deductFromTotal && st.expectedAmount !== null), [streams]);

  const { total, excludedCount } = useMemo(() => {
    if (!rates) return { total: null, excludedCount: 0 };
    let sum = 0;
    let excluded = 0;
    streams.forEach((stream) => {
      if (stream.expectedAmount === null) return;
      const rate = rates[stream.currency];
      if (!rate) {
        excluded += 1;
        return;
      }
      sum += amountForTotal(stream) / rate;
    });
    return { total: sum, excludedCount: excluded };
  }, [streams, rates]);

  const rateLines = useMemo(() => {
    if (!rates) return [];
    const codes = [...new Set(streams.filter((st) => st.expectedAmount !== null).map((st) => st.currency))];
    return codes.filter((code) => code !== currency && rates[code]).map((code) => ({ code, value: 1 / rates[code] }));
  }, [streams, rates, currency]);

  const convertedAmount = (stream) => {
    if (!rates || stream.expectedAmount === null || stream.currency === currency || !rates[stream.currency]) return null;
    return stream.expectedAmount / rates[stream.currency];
  };

  const saveCuts = useCallback(async (id) => {
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
  }, [load, tServer]);

  const saveCutsRef = useRef(saveCuts);
  saveCutsRef.current = saveCuts;

  const handleCutsChange = (id, patch, options = {}) => {
    if (patch.deductFromTotal !== undefined) {
      const target = streamsRef.current.find((item) => item.id === id);
      if (target) {
        const merged = { ...target, ...patch };
        if (patch.deductFromTotal) {
          notify.success(t('income.deductedBody', { amount: formatMoney(calculateCuts(merged).netPerPeriod, { decimals: 0, currency: target.currency }) }), {
            title: t('income.deductedTitle'),
          });
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

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const showIncomeList = () => {
    setOpen(true);
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      icon: LayoutDashboard,
      onSelect: () => {
        setOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    { id: 'income', label: t('income.headerStream'), icon: Banknote, onSelect: showIncomeList },
    ...(isAdmin ? [{ id: 'admin', label: t('nav.admin'), icon: ShieldCheck, to: '/admin' }] : []),
  ];

  const startAdding = () => {
    setOpen(true);
    setEditingId(null);
    setAdding(true);
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
      await load();
    } catch (error) {
      notify.error(tServer(error), { title: t('income.deleteFailedTitle') });
    }
  };

  return (
    <AppShell showLogo pageTitle={t('nav.dashboard')} items={navItems} activeId={open ? 'income' : 'dashboard'}>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-10">
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{t('income.totalLabel')}</p>
          {ratesLoading ? (
            <p className="mt-2 text-sm text-muted">{t('income.ratesLoading')}</p>
          ) : total === null ? (
            <p className="mt-2 text-sm text-muted">{t('errors.ratesUnavailable')}</p>
          ) : (
            <>
              <p className="mt-1 break-words text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {formatMoney(total, { decimals: 2, currency })}
              </p>
              {rateLines.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted">
                  {rateLines.map((line) => (
                    <span key={line.code} className="font-medium tabular-nums text-ink">
                      {t('income.rateLine', {
                        from: line.code,
                        rate: formatNumber(line.value, { maximumFractionDigits: line.value < 1 ? 4 : 2 }),
                        to: currency,
                      })}
                    </span>
                  ))}
                  {ratesLive ? (
                    <span>{t('income.ratesLive')}</span>
                  ) : (
                    ratesUpdatedAt && (
                    <span>
                      {t('income.ratesUpdated', {
                        date: formatDate(new Date(ratesUpdatedAt), { day: 'numeric', month: 'short', year: 'numeric' }),
                      })}
                    </span>
                    )
                  )}
                </div>
              )}
              {anyNet && <p className="mt-2 text-xs text-muted">{t('income.totalAfterCuts')}</p>}
              {ratesStale && <p className="mt-2 text-xs text-amber-600">{t('income.totalStaleNote')}</p>}
              {excludedCount > 0 && (
                <p className="mt-1 text-xs text-amber-600">{t('income.rateUnavailableNote', { count: excludedCount, currency })}</p>
              )}
            </>
          )}
        </div>

        <div ref={listRef} className="flex scroll-mt-20 items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 text-start transition hover:bg-white/70 sm:px-5"
          >
            <span className="truncate text-base font-semibold text-ink">{t('income.headerStream')}</span>
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium tabular-nums text-muted">{streams.length}</span>
            <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} />
          </button>
          {!adding && (
            <button
              type="button"
              onClick={startAdding}
              aria-label={t('income.add')}
              className="flex h-[3.25rem] shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-ink px-4 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('income.add')}</span>
            </button>
          )}
        </div>

        {open && (
          <div className="flex flex-col gap-3">
            {adding && (
              <IncomeForm
                initial={emptyForm(currency)}
                currencies={currencies}
                onCancel={() => setAdding(false)}
                onSubmit={handleCreate}
                submitLabel={t('income.save')}
                busy={busy}
              />
            )}

            {loading ? (
              <div className="rounded-2xl border border-border bg-white px-6 py-8 text-center text-sm text-muted">{t('common.loading')}</div>
            ) : streams.length === 0 && !adding ? (
              <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center">
                <Banknote className="mx-auto h-6 w-6 text-muted" />
                <p className="mt-3 text-base font-medium text-ink">{t('income.emptyTitle')}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {streams.map((stream, index) =>
                  editingId === stream.id ? (
                    <li key={stream.id}>
                      <IncomeForm
                        initial={formFromStream(stream)}
                        currencies={currencies}
                        onCancel={() => setEditingId(null)}
                        onSubmit={(payload) => handleUpdate(stream.id, payload)}
                        submitLabel={t('income.save')}
                        busy={busy}
                      />
                    </li>
                  ) : (
                    <IncomeRow
                      key={stream.id}
                      index={index}
                      stream={stream}
                      currency={currency}
                      converted={convertedAmount(stream)}
                      expanded={expandedId === stream.id}
                      onToggle={() => setExpandedId((prev) => (prev === stream.id ? null : stream.id))}
                      onEdit={() => {
                        setAdding(false);
                        setEditingId(stream.id);
                      }}
                      onDelete={() => handleDelete(stream)}
                      onCutsChange={(patch, options) => handleCutsChange(stream.id, patch, options)}
                      cutsStatus={cutsStatus[stream.id]}
                    />
                  )
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default DashboardPage;
