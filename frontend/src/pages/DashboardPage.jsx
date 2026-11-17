import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Banknote, Plus } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import useAppNav from '../components/layout/useAppNav.jsx';
import BrandMark from '../components/BrandMark.jsx';
import BalanceCard from '../components/dashboard/BalanceCard.jsx';
import BillsPanel from '../components/dashboard/BillsPanel.jsx';
import GroupsHub from '../components/groups/GroupsHub.jsx';
import { DashboardSkeleton } from '../components/Skeletons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useIncome } from '../context/IncomeContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';
import { toBase } from '../utils/incomeMath.js';
import { receiptAmounts } from '../utils/balanceMath.js';
import { useBalance } from '../hooks/useBalance.js';
import { dateOptions, todayInput } from '../utils/dates.js';
import { summarizeBills } from '../utils/billMath.js';
import { monthKey } from '../utils/expenseMath.js';
import { typeLabelKey } from '../components/income/incomeOptions.js';
import { useResource } from '../data/useResource.js';

const LATEST_LIMIT = 8;
const NO_ITEMS = [];

function DashboardPage() {
  const { currency, user } = useAuth();
  const { t } = useTranslation();
  const { formatMoney, formatNumber, formatDate } = useFormat();
  const { streams, allStreams, loading, rates, ratesLoading, ratesLive, ratesStale, ratesUpdatedAt } = useIncome();
  const { items, activeId } = useAppNav();

  const balance = useBalance(monthKey(new Date()));
  const billsResource = useResource('bills', { today: todayInput() });
  const bills = billsResource.data ? billsResource.data.bills : billsResource.error ? NO_ITEMS : null;

  const billsToday = todayInput();
  const billSummary = useMemo(() => (bills && rates ? summarizeBills(bills, rates, currency, billsToday) : null), [bills, rates, currency, billsToday]);

  // Every number here comes from useBalance, the same source as the Income page.
  const data = balance.data;
  const summary = data ? { gross: data.income.gross, net: data.income.net, cuts: data.income.cuts, excluded: data.excluded } : null;
  const spent = data ? data.month.spentAll : 0;
  const spentByOthers = data ? data.month.other : 0;
  const repaid = data ? data.month.repaid : 0;
  const left = data ? data.month.left : 0;
  const streamsById = useMemo(() => new Map(allStreams.map((stream) => [stream.id, stream])), [allStreams]);
  const latest = useMemo(() => balance.receipts.slice(0, LATEST_LIMIT), [balance.receipts]);

  const rateLines = useMemo(() => {
    if (!rates) return [];
    const codes = [...new Set(streams.filter((item) => item.expectedAmount !== null).map((item) => item.currency))];
    return codes
      .filter((code) => code !== currency && rates[code])
      .map((code) => (rates[code] >= 1 ? { code, from: currency, to: code, value: rates[code] } : { code, from: code, to: currency, value: 1 / rates[code] }));
  }, [streams, rates, currency]);

  const hasIncome = balance.receipts.length > 0 || Boolean(balance.opening && balance.opening.amount > 0) || streams.some((item) => item.expectedAmount !== null);

  const ready = Boolean(summary) && !ratesLoading && !loading;
  const cutsBlock = ready && summary.cuts > 0.005 && (
    <dl key="cuts" className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4">
      <div>
        <dt className="text-xs text-muted">{t('dashboard.beforeDeductions')}</dt>
        <dd className="mt-1 text-sm font-semibold tabular-nums text-ink">{formatMoney(summary.gross, { decimals: 2, currency })}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">{t('dashboard.deductions')}</dt>
        <dd className="mt-1 text-sm font-semibold tabular-nums text-ink">- {formatMoney(summary.cuts, { decimals: 2, currency })}</dd>
      </div>
    </dl>
  );
  const rateBlock = ready && rateLines.length > 0 && (
    <div key="rates" className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted">
      {rateLines.map((line) => (
        <span key={line.code} className="font-medium tabular-nums text-ink">
          {t('income.rateLine', { from: line.from, rate: formatNumber(line.value, { minimumFractionDigits: 4, maximumFractionDigits: 4 }), to: line.to })}
        </span>
      ))}
      {ratesLive ? (
        <span>
          {t('income.ratesLive')}
          {ratesUpdatedAt ? ` \u00b7 ${formatDate(new Date(ratesUpdatedAt), { hour: 'numeric', minute: '2-digit', second: '2-digit' })}` : ''}
        </span>
      ) : (
        ratesUpdatedAt && <span>{t('income.ratesUpdated', { date: formatDate(new Date(ratesUpdatedAt), dateOptions) })}</span>
      )}
    </div>
  );
  const staleBlock = ready && ratesStale && (
    <p key="stale" className="mt-2 text-xs text-muted">
      {t('income.totalStaleNote')}
    </p>
  );
  const excludedBlock = ready && summary.excluded > 0 && (
    <p key="excluded" className="mt-1 text-xs text-muted">
      {t('income.rateUnavailableNote', { count: summary.excluded, currency })}
    </p>
  );
  const spentBlock = ready && (
    <div key="spent" className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
      <span className="text-xs text-muted">{t('dashboard.spentMonth')}</span>
      <span className="text-end">
        <span className="block text-sm font-semibold tabular-nums text-ink">
          {spent > 0 ? '- ' : ''}
          {formatMoney(spent, { decimals: 2, currency })}
        </span>
        {spentByOthers > 0 && (
          <span className="mt-0.5 block text-xs text-muted">
            {t('expenses.paidByOthers', { amount: formatMoney(spentByOthers, { decimals: 2, currency }) })}
            {repaid > 0 ? ` · ${t('dashboard.repaidNote', { amount: formatMoney(repaid, { decimals: 2, currency }) })}` : ''}
          </span>
        )}
      </span>
    </div>
  );
  const leftBlock = ready && (
    <div key="left" className="mt-4 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted">{t('balance.leftThisMonth')}</span>
        <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{formatMoney(left, { decimals: 2, currency })}</span>
      </div>
      {(data.overspentMonth || data.belowZero) && (
        <p className="mt-2 flex items-start gap-2 text-xs text-ink">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          {data.belowZero ? t('balance.overspentTotal') : t('balance.overspentMonth', { amount: formatMoney(Math.abs(left), { decimals: 2, currency }) })}
        </p>
      )}
    </div>
  );
  const phoneExtras = [cutsBlock, spentBlock, leftBlock, rateBlock, staleBlock, excludedBlock].filter(Boolean);
  const tabletNotes = [leftBlock, rateBlock, staleBlock, excludedBlock].filter(Boolean);

  const waiting = ratesLoading || loading || balance.status === 'wait';
  const cardStatus = waiting ? 'wait' : !summary ? 'error' : 'ready';
  const hasCuts = ready && summary.cuts > 0.005;

  const share = ready && hasCuts && summary.gross > 0 ? Math.min(100, (summary.cuts / summary.gross) * 100) : 0;
  const tabletRows = [
    { key: 'gross', label: t('dashboard.beforeDeductions'), value: ready ? formatMoney(summary.gross, { decimals: 2, currency }) : '-' },
    { key: 'cuts', label: t('dashboard.deductions'), value: ready ? `${hasCuts ? '- ' : ''}${formatMoney(hasCuts ? summary.cuts : 0, { decimals: 2, currency })}` : '-', bar: ready && hasCuts },
    { key: 'spent', label: t('dashboard.spentMonth'), value: ready ? `${spent > 0 ? '- ' : ''}${formatMoney(spent, { decimals: 2, currency })}` : '-', sub: ready && spentByOthers > 0 ? `${t('expenses.paidByOthers', { amount: formatMoney(spentByOthers, { decimals: 2, currency }) })}${repaid > 0 ? ` · ${t('dashboard.repaidNote', { amount: formatMoney(repaid, { decimals: 2, currency }) })}` : ''}` : '' },
  ];

  const heroCard = (
    <>
      <div className="mx-auto w-full max-w-xl md:max-w-none">
        <div className="md:grid md:grid-cols-[1.4fr_1fr] md:gap-4 lg:grid-cols-[1.7fr_1fr] lg:gap-5">
          <BalanceCard
            status={cardStatus}
            amount={data ? data.running : 0}
            currency={currency}
            holder={user?.name}
            message={waiting ? t('income.ratesLoading') : t('errors.ratesUnavailable')}
          />
          <div className="hidden md:flex md:flex-col md:gap-4">
            {tabletRows.map((row) => (
              <div key={row.key} className="flex flex-1 flex-col justify-center rounded-2xl border border-border bg-white px-6 py-4 lg:px-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{row.label}</p>
                <p className="mt-2 break-words text-[1.5rem] font-bold leading-none tracking-tight tabular-nums text-ink lg:text-[2.25rem]">{row.value}</p>
                {row.sub && <p className="mt-1.5 text-xs font-medium text-muted">{row.sub}</p>}
                {row.bar && (
                  <div className="mt-4">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/70">
                      <div style={{ width: `${Math.max(share, 2)}%` }} className="h-full rounded-full bg-ink" />
                    </div>
                    <p className="mt-1.5 text-xs font-medium tabular-nums text-muted">{t('dashboard.deductionShare', { percent: formatNumber(share, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {phoneExtras.length > 0 && (
          <div className="mt-3 rounded-2xl border border-border bg-white px-4 pb-4 pt-1 md:hidden [&>*:first-child]:mt-3 [&>*:first-child]:border-t-0 [&>*:first-child]:pt-0">{phoneExtras}</div>
        )}
        {tabletNotes.length > 0 && (
          <div className="mt-3 hidden rounded-2xl border border-border bg-white px-5 pb-4 pt-1 md:block [&>*:first-child]:mt-3 [&>*:first-child]:border-t-0 [&>*:first-child]:pt-0">{tabletNotes}</div>
        )}
      </div>
    </>
  );

  const latestCard = (
    <div className="rounded-2xl border border-border bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ink to-[#3a3a42] text-white shadow-sm"><Banknote className="h-[18px] w-[18px]" strokeWidth={2} /></span>
          {t('dashboard.latest')}
        </h2>
        <Link to="/income" className="flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-sm font-semibold text-ink transition hover:bg-border/60">
          {t('dashboard.viewAll')} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <ul>
        {latest.map((receipt) => {
          const stream = streamsById.get(receipt.streamId);
          const amounts = receiptAmounts(receipt, stream);
          const deducted = Math.abs(amounts.gross - amounts.net) > 0.005;
          const shown = amounts.net;
          const converted = receipt.currency === currency ? null : toBase(shown, receipt.currency, rates);
          return (
            <li key={receipt.id} className="border-b border-border last:border-b-0">
              <Link to={`/income#stream-${receipt.streamId}`} className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface/60">
                <BrandMark method={stream?.destinationMethod} name={stream?.destinationName} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{stream ? stream.name : ''}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {formatDate(new Date(receipt.receivedAt), dateOptions)}{stream ? ` · ${t(typeLabelKey(stream.incomeType))}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-end">
                  <span className="block text-sm font-semibold tabular-nums text-ink">{formatMoney(shown, { decimals: 0, currency: receipt.currency })}</span>
                  <span className="block text-xs tabular-nums text-muted">
                    {deducted ? t('income.afterDeductions') : converted !== null ? t('income.approx', { amount: formatMoney(converted, { decimals: 0, currency }) }) : ''}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <AppShell showLogo pageTitle={t('nav.dashboard')} items={items} activeId={activeId}>
      <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">{t('nav.dashboard')}</h1>

        {loading ? (
          <DashboardSkeleton />
        ) : !hasIncome ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted">
              <Banknote className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <p className="mt-4 text-base font-medium text-ink">{t('dashboard.emptyTitle')}</p>
            {user?.role !== 'viewer' && (
              <Link to="/income?add=1" className="mt-5 flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
                <Plus className="h-4 w-4" /> {t('income.add')}
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {heroCard}
            {bills && <BillsPanel bills={bills} summary={billSummary} currency={currency} today={billsToday} />}
            {latestCard}
          </div>
        )}

        {!loading && <div className="mt-5"><GroupsHub /></div>}
      </div>
    </AppShell>
  );
}

export default DashboardPage;
