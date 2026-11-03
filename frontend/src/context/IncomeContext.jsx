import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { notify } from '../i18n/notifications.js';
import { listIncomeStreams } from '../services/incomeStreamService.js';
import { getExchangeRates } from '../services/fxService.js';

const REFRESH_MS = 30 * 1000;

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

  const applyRates = useCallback((data) => {
    setRates(data.rates);
    setRatesStale(Boolean(data.stale));
    setRatesLive(Array.isArray(data.live) && data.live.length > 0);
    setRatesUpdatedAt(data.liveAt || data.updatedAt || data.fetchedAt || null);
  }, []);

  useEffect(() => {
    if (!currency) {
      setRatesLoading(false);
      return undefined;
    }
    let cancelled = false;
    const symbols = neededSymbols ? neededSymbols.split(',') : [];

    setRatesLoading(true);
    getExchangeRates(currency, symbols)
      .then((data) => {
        if (!cancelled) applyRates(data);
      })
      .catch(() => {
        if (!cancelled) setRates(null);
      })
      .finally(() => {
        if (!cancelled) setRatesLoading(false);
      });

    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      getExchangeRates(currency, symbols)
        .then((data) => {
          if (!cancelled) applyRates(data);
        })
        .catch(() => {});
    };
    const timer = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [currency, neededSymbols, applyRates]);

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
