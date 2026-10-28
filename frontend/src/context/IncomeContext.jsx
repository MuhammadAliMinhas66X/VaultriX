import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { notify } from '../i18n/notifications.js';
import { listIncomeStreams } from '../services/incomeStreamService.js';
import { getExchangeRates } from '../services/fxService.js';

const IncomeContext = createContext(null);

export function IncomeProvider({ children }) {
  const { currency } = useAuth();
  const { tServer } = useTranslation();

  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesLive, setRatesLive] = useState(false);
  const [ratesStale, setRatesStale] = useState(false);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(null);

  const load = useCallback(async () => {
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
    () =>
      [...new Set(streams.filter((item) => item.expectedAmount !== null).map((item) => item.currency))]
        .filter((code) => code !== currency)
        .sort()
        .join(','),
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
        setRatesLive(Array.isArray(data.live) && data.live.length > 0);
        setRatesUpdatedAt(data.updatedAt || data.fetchedAt || null);
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

  const value = useMemo(
    () => ({ streams, setStreams, loading, load, rates, ratesLoading, ratesLive, ratesStale, ratesUpdatedAt }),
    [streams, loading, load, rates, ratesLoading, ratesLive, ratesStale, ratesUpdatedAt]
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
