import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { notify } from '../i18n/notifications.js';
import { listIncomeStreams } from '../services/incomeStreamService.js';
import { useResource } from '../data/useResource.js';

const IncomeContext = createContext(null);

export function IncomeProvider({ children }) {
  const { currency } = useAuth();
  const { tServer } = useTranslation();

  const [allStreams, setAllStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await listIncomeStreams();
      setAllStreams(result.incomeStreams);
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Everything on screen uses the active streams. Archived ones are kept in
  // `allStreams` so receipts they already received still count in the balance.
  const streams = useMemo(() => allStreams.filter((item) => !item.isArchived), [allStreams]);
  const archivedStreams = useMemo(() => allStreams.filter((item) => item.isArchived), [allStreams]);
  const setStreams = useCallback(
    (updater) =>
      setAllStreams((prev) => {
        const active = prev.filter((item) => !item.isArchived);
        const next = typeof updater === 'function' ? updater(active) : updater;
        return [...next, ...prev.filter((item) => item.isArchived)];
      }),
    []
  );

  const neededSymbols = useMemo(
    () =>
      [...new Set(streams.filter((item) => item.expectedAmount !== null).map((item) => item.currency))]
        .filter((code) => code !== currency)
        .sort()
        .join(','),
    [streams, currency]
  );

  const ratesResource = useResource('rates', currency ? { base: currency, symbols: neededSymbols } : null, { enabled: Boolean(currency) });
  const ratesData = ratesResource.data;
  const rates = ratesData ? ratesData.rates : null;
  const ratesLoading = ratesResource.loading;
  const ratesLive = Boolean(ratesData && Array.isArray(ratesData.live) && ratesData.live.length > 0);
  const ratesStale = Boolean(ratesData && ratesData.stale);
  const ratesUpdatedAt = ratesData ? ratesData.liveAt || ratesData.updatedAt || ratesData.fetchedAt || null : null;

  const value = useMemo(
    () => ({ streams, archivedStreams, allStreams, setStreams, loading, load, rates, ratesLoading, ratesLive, ratesStale, ratesUpdatedAt }),
    [streams, archivedStreams, allStreams, setStreams, loading, load, rates, ratesLoading, ratesLive, ratesStale, ratesUpdatedAt]
  );

  return <IncomeContext.Provider value={value}>{children}</IncomeContext.Provider>;
}

export function IncomeLayout() {
  return (
    <IncomeProvider>
      <Outlet />
    </IncomeProvider>
  );
}

export const useIncome = () => {
  const value = useContext(IncomeContext);
  if (!value) throw new Error('useIncome must be used inside IncomeProvider');
  return value;
};
