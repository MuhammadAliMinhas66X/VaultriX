import { AlertCircle, Link2, Unlink } from 'lucide-react';
import Combobox from '../Combobox.jsx';
import MoneyInput from '../MoneyInput.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { btn, card, inputClass } from './ui.js';

const SLATE = '#64748b';

function Row({ label, hint, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="min-w-0 text-sm text-muted">
        {label}
        {hint && <span className="block text-xs">{hint}</span>}
      </dt>
      <dd className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{children}</dd>
    </div>
  );
}

// Salary, allocated, unallocated and the income stream connection in one compact card.
export default function SalaryOverview({ arrival, summary, currency, spent, afterSpending, stream, detached, canWrite, busy, onDisconnect, onReconnect, sources, onPickSource, salaryDraft, onSalaryDraft, onSalaryCommit, money }) {
  const { t } = useTranslation();
  const { formatNumber } = useFormat();
  const pctText = (value) => formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const total = summary.salary;
  const scale = summary.over ? summary.allocated : total;
  const widthOf = (value) => (scale > 0 ? Math.min(100, Math.max(0, (value / scale) * 100)) : 0);
  const overAmount = Math.abs(summary.unallocated);
  const streamItems = sources.map((item) => ({ value: item.id, label: item.name, sub: item.currency }));
  const showAfterSpending = afterSpending !== null && Math.abs(afterSpending - summary.unallocated) >= 0.005;

  return (
    <section className={`${card} p-4 sm:p-5`} aria-label={t('salary.title')}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="flex min-w-0 items-center gap-2 text-sm text-ink">
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${detached ? 'border border-muted bg-white' : 'bg-ink'}`} />
          <span className="min-w-0 break-words font-medium">{detached ? t('salary.statusDetached') : t('salary.statusConnected', { name: stream ? stream.name : '' })}</span>
        </p>
        {canWrite && stream && (
          <button type="button" disabled={busy} onClick={detached ? onReconnect : onDisconnect} className={detached ? btn.secondary : btn.ghost}>
            {detached ? <Link2 className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
            {detached ? t('salary.reconnect') : t('salary.disconnect')}
          </button>
        )}
      </div>

      {arrival && (
        <p className="mt-1.5 flex items-center gap-2 text-xs text-muted">
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${arrival.received ? 'bg-ink' : 'border border-muted bg-white'}`} />
          {arrival.text}
        </p>
      )}

      {!detached && sources.length > 1 && (
        <div className="mt-3">
          <Combobox items={streamItems} searchable={sources.length > 6} ariaLabel={t('salary.source')} value={stream ? stream.id : ''} onChange={onPickSource} />
        </div>
      )}

      <div className="mt-5">
        <p className="text-sm text-muted">{summary.over ? t('salary.overBy') : t('salary.unallocated')}</p>
        <p className="mt-1 text-[32px] font-semibold leading-none tracking-tight tabular-nums text-ink">{money(overAmount)}</p>
        <p className="mt-2 text-sm text-muted">{summary.over ? t('salary.percentAllocated', { percent: pctText(summary.allocatedPercent) }) : t('salary.percentUnallocated', { percent: pctText(summary.unallocatedPercent) })}</p>
      </div>

      <div className="mt-5">
        <div
          role="img"
          aria-label={`${t('salary.otherAllocations')} ${money(summary.other)}, ${t('salary.categorySavings')} ${money(summary.savings)}, ${summary.over ? t('salary.overBy') : t('salary.unallocated')} ${money(overAmount)}`}
          className="flex h-3 w-full overflow-hidden rounded-full bg-border/60"
        >
          <div className="h-full bg-ink transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${widthOf(summary.other)}%` }} />
          <div className="h-full transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${widthOf(summary.savings)}%`, background: SLATE }} />
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {[
            { key: 'other', label: t('salary.otherAllocations'), value: summary.other, percent: Math.round((summary.allocatedPercent - summary.savingsPercent) * 100) / 100, swatch: <span className="h-2.5 w-2.5 rounded-sm bg-ink" /> },
            { key: 'savings', label: t('salary.categorySavings'), value: summary.savings, percent: summary.savingsPercent, swatch: <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SLATE }} /> },
            { key: 'free', label: summary.over ? t('salary.overBy') : t('salary.unallocated'), value: overAmount, percent: summary.over ? Math.round((summary.allocatedPercent - 100) * 100) / 100 : summary.unallocatedPercent, swatch: <span className="h-2.5 w-2.5 rounded-sm border border-muted/60 bg-white" /> },
          ].map((row) => (
            <li key={row.key} className="flex items-center gap-2.5 text-sm">
              <span aria-hidden="true" className="flex w-3 shrink-0 justify-center">{row.swatch}</span>
              <span className="min-w-0 flex-1 text-muted">{row.label}</span>
              <span className="whitespace-nowrap font-semibold tabular-nums text-ink">{money(row.value)}</span>
              <span className="w-16 whitespace-nowrap text-end text-xs tabular-nums text-muted">{pctText(row.percent)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {summary.over && (
        <p role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('salary.over', { amount: money(overAmount) })}</span>
        </p>
      )}

      <dl className="mt-4 divide-y divide-border border-t border-border">
        {detached && canWrite ? (
          <div className="py-2.5">
            <dt className="text-sm text-muted">{t('salary.monthlySalary')}</dt>
            <dd className="mt-1.5 flex items-center gap-2">
              <span className="text-sm font-medium text-muted">{currency}</span>
              <MoneyInput
                value={salaryDraft}
                onChange={onSalaryDraft}
                onBlur={onSalaryCommit}
                onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
                disabled={busy}
                aria-label={t('salary.totalLabel')}
                className={`${inputClass(false)} font-semibold tabular-nums`}
              />
            </dd>
          </div>
        ) : (
          <Row label={t('salary.monthlySalary')}>{money(total)}</Row>
        )}
        <Row label={t('salary.allocated')} hint={t('salary.percentAllocated', { percent: pctText(summary.allocatedPercent) })}>{money(summary.allocated)}</Row>
        <Row label={t('salary.spentThisMonth')}>{money(spent)}</Row>
        {showAfterSpending && <Row label={t('salary.saving')}>{money(afterSpending)}</Row>}
      </dl>
    </section>
  );
}
