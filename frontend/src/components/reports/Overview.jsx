import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useIncome } from '../../context/IncomeContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { useResource } from '../../data/useResource.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { buildTrend, savingsRate, spentByCategory, toCsv, expenseRows } from '../../utils/reportMath.js';

const NONE = [];
const card = 'rounded-2xl border border-border bg-white p-4 sm:p-5';

function Stat({ label, value, sub, tone }) {
  return (
    <div className={card}>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={`mt-2 whitespace-nowrap text-xl font-semibold tabular-nums tracking-tight sm:text-2xl ${tone || 'text-ink'}`}>{value}</p>
      {sub && <p className="mt-1 whitespace-nowrap text-xs text-muted">{sub}</p>}
    </div>
  );
}

export default function Overview({ month, onMonth, categories, expenses }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const { currency } = useAuth();
  const { allStreams, rates } = useIncome();
  const calm = useAppReducedMotion();
  const receiptsResource = useResource('receipts');
  const totalsResource = useResource('expenseTotals', {});
  const receipts = receiptsResource.data ? receiptsResource.data.receipts : NONE;
  const totals = totalsResource.data ? totalsResource.data.totals : NONE;
  const ready = Boolean(rates && receiptsResource.data && totalsResource.data);

  const trend = useMemo(() => (ready ? buildTrend({ receipts, streams: allStreams, totals, rates, base: currency, end: month, count: 6 }) : NONE), [ready, receipts, allStreams, totals, rates, currency, month]);
  const current = trend.length ? trend[trend.length - 1] : { income: 0, spent: 0 };
  const rate = savingsRate(current.income, current.spent);
  const kept = current.income - current.spent;
  const peak = Math.max(1, ...trend.flatMap((row) => [row.income, row.spent]));

  const names = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const categoryName = (id) => (id && names.get(id)) || t('reports.uncategorised');
  const byCategory = useMemo(() => {
    if (!rates) return NONE;
    const total = [...spentByCategory(expenses, rates, currency).values()].reduce((sum, value) => sum + value, 0);
    return [...spentByCategory(expenses, rates, currency).entries()]
      .map(([key, value]) => ({ key, value, share: total > 0 ? value / total : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, rates, currency]);

  const top = useMemo(() => [...expenses].filter((item) => item.paidBy !== 'other').sort((a, b) => b.amount - a.amount).slice(0, 5), [expenses]);
  const monthShort = (key) => formatDate(new Date(`${key}-01T00:00:00Z`), { month: 'short', timeZone: 'UTC' });

  const exportCsv = () => {
    const header = [t('reports.csvDate'), t('reports.csvCategory'), t('reports.csvNote'), t('reports.csvAmount'), t('reports.csvCurrency')];
    const blob = new Blob([`﻿${toCsv(expenseRows(expenses, categoryName, header))}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vaultrix-${month}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!ready) return <div className="h-64 animate-pulse rounded-2xl bg-white" aria-busy="true" />;

  const positive = kept >= 0;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={t('reports.income')} value={formatMoney(current.income, { currency })} />
        <Stat label={t('reports.spent')} value={formatMoney(current.spent, { currency })} />
        <div className="col-span-2 sm:col-span-1">
          <Stat
            label={t('reports.kept')}
            value={`${positive ? '' : '−'}${formatMoney(Math.abs(kept), { currency })}`}
            tone={positive ? 'text-ink' : 'text-red-600'}
            sub={rate === null ? t('reports.noIncome') : t('reports.rate', { rate })}
          />
        </div>
      </div>

      <section className={card} aria-label={t('reports.trend')}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">{t('reports.trend')}</h2>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink" />{t('reports.income')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#b8b8be]" />{t('reports.spent')}</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-6 gap-2 sm:gap-4" dir="ltr">
          {trend.map((row, index) => {
            const active = row.month === month;
            return (
              <button key={row.month} type="button" onClick={() => onMonth(row.month)} aria-pressed={active} aria-label={`${monthShort(row.month)} ${row.month.slice(0, 4)}`} className={`group flex flex-col items-center gap-2 rounded-xl px-0.5 pb-2 pt-1 outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${active ? 'bg-surface' : 'hover:bg-surface/70'}`}>
                <div className="flex h-36 w-full items-end justify-center gap-1 sm:gap-1.5">
                  {[['income', 'bg-ink'], ['spent', 'bg-[#b8b8be]']].map(([key, tone], bar) => (
                    <motion.div
                      key={key}
                      initial={calm ? false : { height: 0 }}
                      animate={{ height: `${Math.max(row[key] > 0 ? 3 : 0, (row[key] / peak) * 100)}%` }}
                      transition={{ duration: 0.6, delay: calm ? 0 : index * 0.05 + bar * 0.04, ease: [0.22, 1, 0.36, 1] }}
                      className={`w-3 rounded-t-md sm:w-5 ${tone}`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${active ? 'text-ink' : 'text-muted'}`}>{monthShort(row.month)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={card}>
          <h2 className="text-base font-semibold text-ink">{t('reports.byCategory')}</h2>
          {byCategory.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t('reports.noSpending')}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3.5">
              {byCategory.slice(0, 8).map((row, index) => (
                <li key={row.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium text-ink">{categoryName(row.key === 'none' ? null : row.key)}</span>
                    <span className="flex shrink-0 items-baseline gap-2 whitespace-nowrap tabular-nums">
                      <span className="text-xs text-muted">{Math.round(row.share * 100)}%</span>
                      <span className="font-semibold text-ink">{formatMoney(row.value, { currency })}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                    <motion.div initial={calm ? false : { width: 0 }} animate={{ width: `${Math.max(2, row.share * 100)}%` }} transition={{ duration: 0.6, delay: calm ? 0 : index * 0.05 }} className="h-full rounded-full bg-ink" style={{ opacity: Math.max(0.35, 1 - index * 0.11) }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={card}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ink">{t('reports.top')}</h2>
            <button type="button" onClick={exportCsv} disabled={expenses.length === 0} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-surface disabled:opacity-50">
              <Download className="h-3.5 w-3.5" />{t('reports.export')}
            </button>
          </div>
          {top.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t('reports.noSpending')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {top.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{item.note || categoryName(item.categoryId)}</p>
                    <p className="truncate text-xs text-muted">{categoryName(item.categoryId)} · {formatDate(new Date(item.spentAt), { day: 'numeric', month: 'short', timeZone: 'UTC' })}</p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{formatMoney(item.amount, { currency: item.currency })}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
