import { useMemo } from 'react';
import StepChart from './StepChart.jsx';
import LoanAmounts from './LoanAmounts.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { dateOptions } from '../../utils/dates.js';
import { dayNumberToDate, outstandingSeries } from '../../utils/loanMath.js';

const MAX_LINES = 3;

function LoansOverview({ loans, rates, currency, summary, leftLabel, money }) {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const series = useMemo(() => outstandingSeries(loans, rates, currency), [loans, rates, currency]);
  const showChart = series.points.length >= 2;

  const chart = useMemo(() => {
    if (!showChart) return null;
    const date = (day) => formatDate(dayNumberToDate(day), { ...dateOptions, timeZone: 'UTC' });
    const more = (count) => (count > MAX_LINES ? [t('loans.moreEvents', { count: count - MAX_LINES })] : []);
    const points = series.points.map((point) => ({
      day: point.day,
      balance: point.balance,
      tip: {
        title: date(point.day),
        lines: [
          ...point.events.slice(0, MAX_LINES).map((event) => `${t(event.kind === 'added' ? 'loans.eventAdded' : 'loans.eventPaid', { name: event.name })} ${money(event.amount)}`),
          ...more(point.events.length),
        ],
        total: `${t('loans.chartLeft')} ${money(point.balance)}`,
      },
    }));
    const dues = series.dues.map((due) => ({
      day: due.day,
      overdue: due.overdue,
      tip: {
        title: `${t('loans.chartDue')} · ${date(due.day)}`,
        lines: [...due.items.slice(0, MAX_LINES).map((item) => `${item.name} ${money(item.left)}`), ...more(due.items.length)],
        total: null,
      },
    }));
    return { points, dues };
  }, [series, showChart, t, formatDate, money]);

  return (
    <div className="mb-4 rounded-2xl border border-border bg-white p-4 sm:p-5">
      <div className={showChart ? 'grid gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-8' : ''}>
        <LoanAmounts total={summary.total} paid={summary.paid} left={summary.left} leftLabel={leftLabel} money={money} />
        {showChart && (
          <div className="min-w-0">
            <p className="mb-2 text-xs text-muted">{t('loans.overviewTitle')}</p>
            <StepChart points={chart.points} dues={chart.dues} startDay={series.startDay} endDay={series.endDay} today={series.today} max={series.max} label={t('loans.overviewTitle')} />
          </div>
        )}
      </div>
      {summary.excluded > 0 && <p className="mt-3 text-xs text-muted">{t('loans.excludedNote', { count: summary.excluded })}</p>}
    </div>
  );
}

export default LoansOverview;
