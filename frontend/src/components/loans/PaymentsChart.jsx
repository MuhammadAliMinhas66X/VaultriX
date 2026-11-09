import { useMemo } from 'react';
import StepChart from './StepChart.jsx';
import PaymentBar from './PaymentBar.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { dateOptions } from '../../utils/dates.js';
import { balanceSeries, dayNumberToDate, loanState } from '../../utils/loanMath.js';

function PaymentsChart({ loan }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();

  const chart = useMemo(() => {
    const money = (value) => formatMoney(value, { decimals: 0, maxDecimals: 4, currency: loan.currency });
    const date = (day) => formatDate(dayNumberToDate(day), { ...dateOptions, timeZone: 'UTC' });
    const series = balanceSeries(loan);
    const points = series.points.map((point, index) => ({
      day: point.day,
      balance: point.balance,
      tip: index === 0 ? null : { title: date(point.day), lines: [`${t('loans.statPaid')} ${money(point.payment.amount)}`], total: `${t('loans.chartLeft')} ${money(point.balance)}` },
    }));
    const dues =
      series.dueDay !== null && !loan.done
        ? [{ day: series.dueDay, overdue: loanState(loan, series.today).overdue, tip: { title: `${t('loans.chartDue')} · ${date(series.dueDay)}`, lines: [`${t('loans.chartLeft')} ${money(loan.remaining)}`], total: null } }]
        : [];
    return { points, dues, series };
  }, [loan, t, formatMoney, formatDate]);

  if (loan.payments.length === 0) return <p className="text-sm text-muted">{t('loans.noPayments')}</p>;

  const { series } = chart;
  const percent = Math.round(loanState(loan, series.today).progress * 100);
  const spansDays = new Set(chart.points.map((point) => point.day)).size > 2;
  const last = loan.payments[loan.payments.length - 1];
  const facts = [
    t('loans.chartPercent', { percent }),
    t('loans.chartCount', { count: loan.payments.length }),
    t('loans.chartLast', { date: formatDate(new Date(last.paidAt), { ...dateOptions, timeZone: 'UTC' }) }),
  ];

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2">
        {facts.map((fact) => (
          <li key={fact} className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium tabular-nums text-ink">
            {fact}
          </li>
        ))}
      </ul>
      <PaymentBar loan={loan} />
      {spansDays && <StepChart points={chart.points} dues={chart.dues} startDay={series.startDay} endDay={series.endDay} today={series.today} max={loan.amount} label={t('loans.chartLabel')} />}
    </div>
  );
}

export default PaymentsChart;
