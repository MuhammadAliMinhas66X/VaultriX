import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, LayoutDashboard, Plus, ShieldCheck } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import { ADMIN_EMAIL } from '../components/RequireAdmin.jsx';
import IncomeForm, { emptyForm, formFromStream } from '../components/income/IncomeForm.jsx';
import IncomeRow, { IncomeHeaderRow } from '../components/income/IncomeRow.jsx';
import BrandMark from '../components/BrandMark.jsx';
import { typeLabelKey } from '../components/income/incomeOptions.js';
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
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cutsStatus, setCutsStatus] = useState({});
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
  const focusStream = (id) => {
    setExpandedId(id);
    setTimeout(() => document.getElementById(`stream-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      icon: LayoutDashboard,
      onSelect: () => {
        setExpandedId(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    {
      type: 'group',
      id: 'streams',
      label: t('income.headerStream'),
      count: streams.length,
      items: [
        { id: 'add', label: t('income.add'), icon: Plus, onSelect: () => startAdding() },
        ...streams.map((stream) => ({
          id: `stream:${stream.id}`,
          label: stream.name,
          mark: <BrandMark method={stream.destinationMethod} name={stream.destinationName} size="sm" />,
          onSelect: () => focusStream(stream.id),
        })),
      ],
    },
    ...(isAdmin ? [{ id: 'admin', label: t('nav.admin'), icon: ShieldCheck, to: '/admin' }] : []),
  ];

  const typeShares = useMemo(() => {
    if (!rates || !total) return [];
    const sums = new Map();
    streams.forEach((stream) => {
      if (stream.expectedAmount === null || !rates[stream.currency]) return;
      const key = stream.incomeType === 'freelance' ? 'business' : stream.incomeType;
      sums.set(key, (sums.get(key) || 0) + amountForTotal(stream) / rates[stream.currency]);
    });
    return [...sums.entries()]
      .filter(([, value]) => value > 0)
      .sort((x, y) => y[1] - x[1])
      .map(([type, value]) => ({ type, share: value / total }));
  }, [streams, rates, total]);

  const startAdding = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const summaryCard = (
    <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{t('income.totalLabel')}</p>
      {ratesLoading ? (
        <p className="mt-2 text-sm text-muted">{t('income.ratesLoading')}</p>
      ) : total === null ? (
        <p className="mt-2 text-sm text-muted">{t('errors.ratesUnavailable')}</p>
      ) : (
        <>
          <p className="mt-1 break-words text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{formatMoney(total, { decimals: 2, currency })}</p>
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
                  <span>{t('income.ratesUpdated', { date: formatDate(new Date(ratesUpdatedAt), { day: 'numeric', month: 'short', year: 'numeric' }) })}</span>
                )
              )}
            </div>
          )}
          {anyNet && <p className="mt-2 text-xs text-muted">{t('income.totalAfterCuts')}</p>}
          {ratesStale && <p className="mt-2 text-xs text-amber-600">{t('income.totalStaleNote')}</p>}
          {excludedCount > 0 && <p className="mt-1 text-xs text-amber-600">{t('income.rateUnavailableNote', { count: excludedCount, currency })}</p>}
        </>
      )}
    </div>
  );

  const sharesCard =
    typeShares.length > 0 ? (
      <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{t('income.typeLabel')}</p>
        <ul className="mt-4 flex flex-col gap-3.5">
          {typeShares.map((item) => (
            <li key={item.type}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium text-ink">{t(typeLabelKey(item.type))}</span>
                <span className="shrink-0 tabular-nums text-muted">{Math.round(item.share * 100)}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-ink/80 transition-all duration-500" style={{ width: `${Math.max(2, Math.round(item.share * 100))}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <AppShell showLogo pageTitle={t('nav.dashboard')} items={navItems} activeId={expandedId ? `stream:${expandedId}` : 'dashboard'}>
      <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-ink">{t('income.headerStream')}</h1>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-muted ring-1 ring-border">{streams.length}</span>
          </div>
          {!adding && (
            <button
              type="button"
              onClick={startAdding}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              <span>{t('income.add')}</span>
            </button>
          )}
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <aside className="order-1 grid gap-4 md:grid-cols-2 xl:sticky xl:top-20 xl:order-2 xl:grid-cols-1">
            {summaryCard}
            {sharesCard}
          </aside>

          <section className="order-2 flex min-w-0 flex-col gap-4 xl:order-1">
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
              <div className="rounded-2xl border border-border bg-white px-6 py-10 text-center text-sm text-muted">{t('common.loading')}</div>
            ) : streams.length === 0 && !adding ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted">
                  <Banknote className="h-6 w-6" strokeWidth={1.5} />
                </span>
                <p className="mt-4 text-base font-medium text-ink">{t('income.emptyTitle')}</p>
                <button type="button" onClick={startAdding} className="mt-5 flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
                  <Plus className="h-4 w-4" /> {t('income.add')}
                </button>
              </div>
            ) : (
              streams.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-border bg-white">
                  <IncomeHeaderRow />
                  <ul>
                    {streams.map((stream, index) =>
                      editingId === stream.id ? (
                        <li key={stream.id} id={`stream-${stream.id}`} className="border-b border-border p-3 last:border-b-0 sm:p-4">
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
                </div>
              )
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

export default DashboardPage;
