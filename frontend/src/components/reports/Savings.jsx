import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, PiggyBank, Plus, X } from 'lucide-react';
import MoneyInput from '../MoneyInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useIncome } from '../../context/IncomeContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { notify } from '../../i18n/notifications.js';
import { useResource } from '../../data/useResource.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { monthlyKept, savedSummary } from '../../utils/savingsMath.js';
import { addSaving, removeSaving } from '../../services/planningService.js';

const NONE = [];
const card = 'rounded-2xl border border-border bg-white p-4 sm:p-5';
const field = 'w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';

// Total saved = what was left of each month (worked out from income and spending) + what you added by hand.
export default function Savings({ canWrite }) {
  const { t, tServer } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const { currency } = useAuth();
  const { allStreams, rates } = useIncome();
  const calm = Boolean(useAppReducedMotion());
  const receiptsResource = useResource('receipts');
  const totalsResource = useResource('expenseTotals', {});
  const savingsResource = useResource('savings');
  const receipts = receiptsResource.data ? receiptsResource.data.receipts : NONE;
  const totals = totalsResource.data ? totalsResource.data.totals : NONE;
  const entries = savingsResource.data ? savingsResource.data.entries : NONE;
  const ready = Boolean(rates && receiptsResource.data && totalsResource.data && savingsResource.data);

  const rows = useMemo(() => (ready ? monthlyKept({ receipts, streams: allStreams, totals, rates, base: currency }) : NONE), [ready, receipts, allStreams, totals, rates, currency]);
  const summary = useMemo(() => (ready ? savedSummary(rows, entries, rates, currency) : { auto: 0, manual: 0, total: 0 }), [ready, rows, entries, rates, currency]);
  const [mode, setMode] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [all, setAll] = useState(false);
  const peak = Math.max(1, ...rows.map((row) => row.kept));
  const monthName = (key) => formatDate(new Date(`${key}-01T00:00:00Z`), { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const submit = async (event) => {
    event.preventDefault();
    if (!(Number(amount) > 0)) return;
    setBusy(true);
    try {
      await addSaving({ amount: Number(amount), currency, direction: mode, note: note.trim() });
      setMode(null);
      setAmount('');
      setNote('');
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };
  const drop = async (id) => {
    try {
      await removeSaving(id);
    } catch (error) {
      notify.error(tServer(error));
    }
  };

  if (!ready) return <div className="h-56 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  const shown = all ? rows : rows.slice(0, 4);

  return (
    <section className={card} aria-label={t('savings.title')}>
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-white"><PiggyBank className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted">{t('savings.total')}</p>
          <motion.p key={Math.round(summary.total)} initial={calm ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-0.5 whitespace-nowrap text-3xl font-semibold tabular-nums tracking-tight text-ink">{formatMoney(summary.total, { currency })}</motion.p>
          <p className="mt-1 text-xs text-muted">{t('savings.split', { auto: formatMoney(summary.auto, { currency }), manual: formatMoney(summary.manual, { currency }) })}</p>
        </div>
      </div>

      {canWrite && mode === null && (
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setMode('in')} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2.5 text-sm font-medium text-white transition hover:opacity-90"><Plus className="h-4 w-4" />{t('savings.add')}</button>
          <button type="button" onClick={() => setMode('out')} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-surface"><Minus className="h-4 w-4" />{t('savings.takeOut')}</button>
        </div>
      )}
      {mode !== null && (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3 rounded-xl bg-surface p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted">{currency}</span>
            <MoneyInput autoFocus value={amount} onChange={setAmount} aria-label={mode === 'in' ? t('savings.add') : t('savings.takeOut')} className={field} />
          </div>
          <input value={note} maxLength={80} onChange={(event) => setNote(event.target.value)} placeholder={t('reports.notePlaceholder')} className={field} />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !(Number(amount) > 0)} className="flex-1 rounded-xl bg-ink px-3 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">{mode === 'in' ? t('savings.add') : t('savings.takeOut')}</button>
            <button type="button" onClick={() => { setMode(null); setAmount(''); }} className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-ink">{t('common.cancel')}</button>
          </div>
        </form>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-ink">{t('savings.months')}</h3>
        <p className="mt-0.5 text-xs text-muted">{t('savings.monthsHint')}</p>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t('savings.noMonths')}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {shown.map((row, index) => (
              <li key={row.month}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-ink">{monthName(row.month)}{row.open && <span className="ms-2 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">{t('savings.soFar')}</span>}</span>
                  <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-ink">{formatMoney(row.kept, { currency })}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                  <motion.div initial={calm ? false : { width: 0 }} animate={{ width: `${row.kept > 0 ? Math.max(2, (row.kept / peak) * 100) : 0}%` }} transition={{ duration: 0.6, delay: calm ? 0 : index * 0.05 }} className="h-full rounded-full bg-ink" />
                </div>
                <p className="mt-1 whitespace-nowrap text-xs tabular-nums text-muted">{t('savings.rowLine', { income: formatMoney(row.income, { currency }), spent: formatMoney(row.spent, { currency }) })}</p>
              </li>
            ))}
          </ul>
        )}
        {rows.length > 4 && <button type="button" onClick={() => setAll((value) => !value)} className="mt-3 text-xs font-medium text-muted transition hover:text-ink">{all ? t('savings.showLess') : t('savings.showAll', { count: rows.length })}</button>}
      </div>

      {entries.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-ink">{t('savings.yours')}</h3>
          <ul className="mt-2 divide-y divide-border">
            {entries.slice(0, 15).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{entry.note || (entry.amount >= 0 ? t('savings.add') : t('savings.takeOut'))}</p>
                  <p className="text-xs text-muted">{formatDate(new Date(`${entry.date}T00:00:00Z`), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{entry.amount >= 0 ? '+' : '−'}{formatMoney(Math.abs(entry.amount), { currency: entry.currency })}</span>
                  {canWrite && <button type="button" aria-label={t('reports.remove')} onClick={() => drop(entry.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink"><X className="h-3.5 w-3.5" /></button>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
