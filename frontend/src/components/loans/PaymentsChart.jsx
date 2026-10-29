import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { dateOptions } from '../../utils/dates.js';
import { balanceSeries, dayNumberToDate } from '../../utils/loanMath.js';

const HEIGHT = 224;
const MARGIN = { top: 30, right: 14, bottom: 30, left: 46 };

const useWidth = (ref, fallback = 360) => {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
};

function SegmentBar({ loan }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const total = loan.amount || 1;

  return (
    <div>
      <div
        role="img"
        aria-label={t('loans.paidOf', { paid: formatMoney(loan.paid, { currency: loan.currency }), total: formatMoney(loan.amount, { currency: loan.currency }) })}
        className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full bg-border/70"
      >
        {loan.payments.map((payment, index) => (
          <span
            key={payment.id}
            title={`${formatMoney(payment.amount, { currency: loan.currency })} · ${formatDate(new Date(payment.paidAt), dateOptions)}`}
            style={{ width: `${(payment.amount / total) * 100}%` }}
            className={`h-full shrink-0 transition-[width] duration-500 ${index % 2 === 0 ? 'bg-ink' : 'bg-ink/60'}`}
          />
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-ink" />
          {t('loans.statPaid')} <span className="font-semibold tabular-nums text-ink">{formatMoney(loan.paid, { currency: loan.currency })}</span>
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          {t('loans.chartLeft')} <span className="font-semibold tabular-nums text-ink">{formatMoney(loan.remaining, { currency: loan.currency })}</span>
        </span>
      </div>
    </div>
  );
}

function BalanceChart({ loan }) {
  const { t } = useTranslation();
  const { formatMoney, formatNumber, formatDate } = useFormat();
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef);
  const [active, setActive] = useState(null);

  const { points, startDay, endDay, dueDay, today } = balanceSeries(loan);
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const span = endDay - startDay;
  const x = (day) => MARGIN.left + ((day - startDay) / span) * innerW;
  const y = (value) => MARGIN.top + (1 - value / loan.amount) * innerH;
  const bottom = y(0);

  let line = `M ${x(points[0].day)} ${y(points[0].balance)}`;
  points.slice(1).forEach((point) => {
    line += ` H ${x(point.day)} V ${y(point.balance)}`;
  });
  line += ` H ${x(endDay)}`;
  const area = `${line} V ${bottom} H ${x(startDay)} Z`;

  const ticks = [0, 0.5, 1].map((fraction) => ({ fraction, value: loan.amount * fraction }));
  const compact = (value) => formatNumber(value, { notation: 'compact', maximumFractionDigits: 1 });
  const short = { day: 'numeric', month: 'short', timeZone: 'UTC' };

  const showToday = !loan.done && today >= startDay && today <= endDay;
  const showDue = dueDay !== null && dueDay >= startDay && dueDay <= endDay;
  const close = showToday && showDue && Math.abs(x(today) - x(dueDay)) < 52;
  const todayLeft = showToday && showDue && x(today) < x(dueDay);

  const tooltipPoint = active === null ? null : points[active];
  const tooltipLeft = tooltipPoint ? Math.min(Math.max(x(tooltipPoint.day), 70), width - 70) : 0;

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg width={width} height={HEIGHT} role="img" aria-label={t('loans.chartLabel')} className="block max-w-full overflow-visible">
        {ticks.map((tick) => (
          <g key={tick.fraction}>
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick.value)} y2={y(tick.value)} className="stroke-border" strokeWidth="1" />
            <text x={MARGIN.left - 8} y={y(tick.value)} textAnchor="end" dominantBaseline="middle" className="fill-muted text-[11px] tabular-nums">
              {compact(tick.value)}
            </text>
          </g>
        ))}

        <path d={area} className="fill-ink/[0.06]" />

        {showDue && (
          <g>
            <line x1={x(dueDay)} x2={x(dueDay)} y1={MARGIN.top - 6} y2={bottom} className="stroke-ink" strokeWidth="1" strokeDasharray="3 3" />
            <text x={x(dueDay)} y={MARGIN.top - 12} textAnchor={close ? (todayLeft ? 'start' : 'end') : 'middle'} className="fill-ink text-[11px] font-semibold">
              {t('loans.chartDue')}
            </text>
          </g>
        )}
        {showToday && (
          <g>
            <line x1={x(today)} x2={x(today)} y1={MARGIN.top - 6} y2={bottom} className="stroke-muted/60" strokeWidth="1" />
            <text x={x(today)} y={MARGIN.top - 12} textAnchor={close ? (todayLeft ? 'end' : 'start') : 'middle'} className="fill-muted text-[11px] font-medium">
              {t('loans.chartToday')}
            </text>
          </g>
        )}

        <path d={line} fill="none" className="stroke-ink" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(points[0].day)} cy={y(points[0].balance)} r="3.5" className="fill-ink" />

        {points.slice(1).map((point, index) => {
          const position = index + 1;
          const label = `${formatMoney(point.payment.amount, { currency: loan.currency })}, ${formatDate(new Date(point.payment.paidAt), dateOptions)}`;
          return (
            <g key={point.payment.id}>
              <circle cx={x(point.day)} cy={y(point.balance)} r="5" className="fill-white stroke-ink" strokeWidth="2" />
              <circle
                cx={x(point.day)}
                cy={y(point.balance)}
                r="16"
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={label}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setActive(position)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(position)}
                onBlur={() => setActive(null)}
                onClick={() => setActive((prev) => (prev === position ? null : position))}
              />
            </g>
          );
        })}

        {loan.payments.length === 0 && (
          <text x={MARGIN.left + innerW / 2} y={MARGIN.top + innerH / 2 - 14} textAnchor="middle" className="fill-muted text-xs">
            {t('loans.noPayments')}
          </text>
        )}

        <text x={MARGIN.left} y={HEIGHT - 8} textAnchor="start" className="fill-muted text-[11px]">
          {formatDate(dayNumberToDate(startDay), short)}
        </text>
        <text x={width - MARGIN.right} y={HEIGHT - 8} textAnchor="end" className="fill-muted text-[11px]">
          {formatDate(dayNumberToDate(endDay), short)}
        </text>
      </svg>

      {tooltipPoint && tooltipPoint.payment && (
        <div
          style={{ left: tooltipLeft, top: Math.max(0, y(tooltipPoint.balance) - 62) }}
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-center text-xs text-white shadow-lg"
        >
          <span className="block font-semibold tabular-nums">{formatMoney(tooltipPoint.payment.amount, { currency: loan.currency })}</span>
          <span className="block text-white/70">{formatDate(new Date(tooltipPoint.payment.paidAt), dateOptions)}</span>
        </div>
      )}
    </div>
  );
}

function PaymentsChart({ loan }) {
  return (
    <div className="flex flex-col gap-5">
      <SegmentBar loan={loan} />
      <BalanceChart loan={loan} />
    </div>
  );
}

export default PaymentsChart;
