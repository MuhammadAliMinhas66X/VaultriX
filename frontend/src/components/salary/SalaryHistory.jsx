import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { isSavingsLine, spentInMonth } from '../../utils/salaryPlanMath.js';
import { card } from './ui.js';

const round2 = (value) => Math.round(value * 100) / 100;

export default function SalaryHistory({ logs, month, nowMonth, totals, rates, fallbackCurrency, monthLabel, onOpen }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();

  const rows = logs.map((log) => {
    const currency = log.currency || fallbackCurrency;
    const lines = log.lines || [];
    const savings = round2(lines.filter(isSavingsLine).reduce((sum, line) => sum + line.amount, 0));
    const leftAfterSpending = log.month <= nowMonth && rates ? round2(log.salary - spentInMonth(totals, log.month, rates, currency)) : null;
    const fmt = (value) => formatMoney(value, { decimals: 0, maxDecimals: 2, currency });
    return {
      key: log.month,
      month: log.month,
      label: monthLabel(log.month),
      salary: fmt(log.salary),
      allocated: fmt(log.planned),
      savings: fmt(savings),
      unallocated: fmt(round2(log.salary - log.planned)),
      left: leftAfterSpending === null ? t('salary.logNotYet') : fmt(leftAfterSpending),
    };
  });

  const cols = [
    ['salary', 'colSalary'],
    ['allocated', 'colAllocated'],
    ['savings', 'colSavings'],
    ['unallocated', 'colUnallocated'],
    ['left', 'logActualLeft'],
  ];

  return (
    <section className={`${card} p-4 sm:p-5`}>
      <h2 className="text-base font-semibold tracking-tight text-ink">{t('salary.logsTitle')}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 rounded-lg bg-surface px-4 py-6 text-center text-sm text-muted">{t('salary.logsEmpty')}</p>
      ) : (
        <>
          <table className="mt-3 hidden w-full table-fixed text-sm lg:table">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th scope="col" className="w-[22%] pb-2 text-start font-medium">{t('salary.colMonth')}</th>
                {cols.map(([, key]) => <th key={key} scope="col" className="pb-2 text-end font-medium">{t(`salary.${key}`)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.key} aria-current={row.month === month ? 'true' : undefined} className={`transition hover:bg-surface ${row.month === month ? 'bg-surface' : ''}`}>
                  <th scope="row" className="py-0 text-start font-medium text-ink">
                    <button type="button" onClick={() => onOpen(row.month)} className="h-11 w-full text-start outline-none focus-visible:underline">{row.label}</button>
                  </th>
                  {cols.map(([field]) => <td key={field} className="whitespace-nowrap py-3 text-end tabular-nums text-ink">{row[field]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="mt-3 flex flex-col gap-2 lg:hidden">
            {rows.map((row) => (
              <li key={row.key}>
                <button type="button" onClick={() => onOpen(row.month)} aria-current={row.month === month ? 'true' : undefined} className={`w-full rounded-lg border px-3.5 py-3 text-start outline-none transition hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/30 ${row.month === month ? 'border-ink' : 'border-border'}`}>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-ink">{row.label}</span>
                    <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{row.salary}</span>
                  </span>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                    {cols.slice(1).map(([field, key]) => (
                      <div key={field}>
                        <dt className="text-muted">{t(`salary.${key}`)}</dt>
                        <dd className="mt-0.5 whitespace-nowrap font-medium tabular-nums text-ink">{row[field]}</dd>
                      </div>
                    ))}
                  </dl>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
