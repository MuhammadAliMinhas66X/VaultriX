import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useIncome } from '../context/IncomeContext.jsx';
import { useResource } from '../data/useResource.js';
import { computeBalance, openingSince } from '../utils/balanceMath.js';

const NONE = [];

// The one source of balance numbers. status: 'wait' | 'error' | 'ready'.
export function useBalance(month) {
  const { currency } = useAuth();
  const { streams, rates, loading: streamsLoading, ratesLoading } = useIncome();
  const receiptsResource = useResource('receipts');
  const openingResource = useResource('opening');
  const opening = openingResource.data ? openingResource.data.opening : null;
  const since = openingSince(opening);
  const totalsResource = useResource('expenseTotals', { since }, { enabled: Boolean(openingResource.data) });

  const receipts = receiptsResource.data ? receiptsResource.data.receipts : NONE;
  const totals = totalsResource.data ? totalsResource.data.totals : NONE;
  const failed = Boolean(receiptsResource.error || openingResource.error || totalsResource.error);
  const loaded = Boolean(receiptsResource.data && openingResource.data && totalsResource.data);

  const data = useMemo(
    () => (loaded && rates ? computeBalance({ opening, receipts, streams, totals, rates, base: currency, month }) : null),
    [loaded, rates, opening, receipts, streams, totals, currency, month]
  );

  const status = data ? 'ready' : failed || (!ratesLoading && !streamsLoading && loaded && !rates) ? 'error' : 'wait';
  return { status, data, opening, receipts, capped: Boolean(receiptsResource.data && receiptsResource.data.capped) };
}
