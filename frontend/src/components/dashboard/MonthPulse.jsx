import { ArrowDownRight, ArrowUpRight, CalendarDays } from 'lucide-react';
import Section from './Section.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { changePercent } from '../../utils/dashboardMath.js';
import { savingsRate } from '../../utils/reportMath.js';

function Tile({ label, value, sub, tone = 'text-ink', change }) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl bg-surface px-4 py-3.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</span>
      <span className={`mt-2 whitespace-nowrap text-[clamp(1.05rem,5vw,1.5rem)] font-bold leading-none tracking-tight tabular-nums ${tone}`}>{value}</span>
      <span className="mt-1.5 flex items-center gap-1 whitespace-nowrap text-xs text-muted">
        {change !== undefined && change !== null && change !== 0 && (change > 0 ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0" /> : <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />)}
        <span className="truncate">{sub}</span>
      </span>
    </div>
  );
}

// The month in four numbers, plus a pace bar: how much of the income is already spent
// against how much of the month has passed.
export default function MonthPulse({ month, pace, previous, currency }) {
  const { t } = useTranslation();
  const { formatMoney, formatNumber } = useFormat();
  const received = month.received;
  const spent = month.spentSelf;
  const kept = month.left;
  // One style for every tile: whole numbers once the amounts get large, cents otherwise.
  const decimals = Math.max(received, spent, Math.abs(kept), pace.projected) >= 10000 ? 0 : 2;
  const money = (value) => formatMoney(value, { decimals, currency });
  const rate = savingsRate(received, spent);
  const incomeChange = previous ? changePercent(received, previous.income) : null;
  const spentChange = previous ? changePercent(spent, previous.spent) : null;
  const vsLast = (change) => (change === null ? t('dash.noLastMonth') : t('dash.vsLast', { percent: `${change > 0 ? '+' : ''}${formatNumber(change)}` }));

  const usedShare = received > 0 ? Math.min(100, (spent / received) * 100) : 0;
  const overPace = received > 0 && pace.projected > received + 0.005;

  return (
    <Section icon={CalendarDays} title={t('dash.monthTitle')}>
      <div className="px-4 pb-5 sm:px-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label={t('dash.income')} value={money(received)} sub={vsLast(incomeChange)} change={incomeChange} />
          <Tile label={t('dash.spent')} value={money(spent)} sub={vsLast(spentChange)} change={spentChange} />
          <Tile
            label={kept < -0.005 ? t('dash.overspent') : t('dash.kept')}
            value={`${kept < -0.005 ? '- ' : ''}${money(Math.abs(kept))}`}
            tone={kept < -0.005 ? 'text-red-600' : 'text-ink'}
            sub={rate === null ? t('dash.noIncomeYet') : t('dash.keptRate', { rate: formatNumber(rate) })}
          />
          <Tile
            label={t('dash.safePerDay')}
            value={pace.safePerDay > 0 ? money(pace.safePerDay) : money(0)}
            sub={pace.safePerDay > 0 ? t('dash.safeSub', { count: pace.daysLeft }) : t('dash.safeNone')}
          />
        </div>

        <div className="mt-4">
          <div className="relative pt-1">
            <div className="h-2 overflow-hidden rounded-full bg-border/70">
              <div style={{ width: `${received > 0 ? Math.max(usedShare, spent > 0 ? 2 : 0) : 0}%` }} className={`h-full rounded-full transition-all duration-700 ${overPace ? 'bg-red-600' : 'bg-ink'}`} />
            </div>
            <span aria-hidden="true" style={{ insetInlineStart: `${pace.elapsed * 100}%` }} className="absolute -top-0.5 h-4 w-0.5 -translate-x-1/2 rounded-full bg-muted rtl:translate-x-1/2" />
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-muted">
            {t('dash.paceText', { day: pace.day, total: pace.size, amount: money(pace.projected) })}
            {overPace ? ` ${t('dash.paceOver', { over: money(pace.projected - received) })}` : ''}
          </p>
        </div>
      </div>
    </Section>
  );
}
