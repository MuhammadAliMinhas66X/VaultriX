import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { dayNumberToDate } from '../../utils/loanMath.js';

const HEIGHT = 232;
const MARGIN = { top: 28, right: 16, bottom: 34, left: 48 };
const SHORT = { day: 'numeric', month: 'short', timeZone: 'UTC' };

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

function StepChart({ points, dues = [], startDay, endDay, today, max, label }) {
  const { t } = useTranslation();
  const { formatNumber, formatDate } = useFormat();
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef);
  const [active, setActive] = useState(null);

  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const span = Math.max(1, endDay - startDay);
  const x = (day) => MARGIN.left + ((day - startDay) / span) * innerW;
  const y = (value) => MARGIN.top + (1 - Math.min(value, max) / max) * innerH;
  const bottom = y(0);

  let line = `M ${x(points[0].day)} ${y(points[0].balance)}`;
  points.slice(1).forEach((point) => {
    line += ` H ${x(point.day)} V ${y(point.balance)}`;
  });
  line += ` H ${x(endDay)}`;
  const area = `${line} V ${bottom} H ${x(points[0].day)} Z`;

  const ticks = [0, 0.5, 1].map((fraction) => max * fraction);
  const compact = (value) => formatNumber(value, { notation: 'compact', maximumFractionDigits: 1 });
  const showToday = today >= startDay && today <= endDay;

  const markers = [
    ...points.filter((point) => point.tip).map((point, index) => ({ key: `p${index}`, kind: 'point', day: point.day, at: y(point.balance), tip: point.tip })),
    ...dues.map((due, index) => ({ key: `d${index}`, kind: due.overdue ? 'overdue' : 'due', day: due.day, at: bottom, tip: due.tip })),
  ];
  const current = active === null ? null : markers.find((marker) => marker.key === active) || null;
  const tipLeft = current ? Math.min(Math.max(x(current.day), 84), width - 84) : 0;

  const bind = (key) => ({
    onMouseEnter: () => setActive(key),
    onMouseLeave: () => setActive(null),
    onFocus: () => setActive(key),
    onBlur: () => setActive(null),
    onClick: () => setActive((prev) => (prev === key ? null : key)),
  });

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg width={width} height={HEIGHT} role="img" aria-label={label} className="block max-w-full overflow-visible">
        {ticks.map((value) => (
          <g key={value}>
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(value)} y2={y(value)} className="stroke-border" strokeWidth="1" strokeDasharray={value === 0 ? undefined : '3 4'} />
            <text x={MARGIN.left - 8} y={y(value)} textAnchor="end" dominantBaseline="middle" className="fill-muted text-[11px] tabular-nums">
              {compact(value)}
            </text>
          </g>
        ))}

        <path d={area} className="fill-ink/[0.07]" />

        {showToday && (
          <g>
            <line x1={x(today)} x2={x(today)} y1={MARGIN.top - 6} y2={bottom} className="stroke-muted/60" strokeWidth="1" />
            <text x={x(today)} y={MARGIN.top - 12} textAnchor={x(today) > width - 40 ? 'end' : x(today) < MARGIN.left + 24 ? 'start' : 'middle'} className="fill-muted text-[11px] font-medium">
              {t('loans.chartToday')}
            </text>
          </g>
        )}

        <path d={line} fill="none" className="stroke-ink" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />

        {markers.map((marker) => {
          const aria = `${marker.tip.title}. ${marker.tip.lines.join(', ')}`;
          return (
            <g key={marker.key}>
              {marker.kind === 'point' ? (
                <circle cx={x(marker.day)} cy={marker.at} r="4.5" className={`stroke-ink ${active === marker.key ? 'fill-ink' : 'fill-white'}`} strokeWidth="2" />
              ) : (
                <path
                  d={`M ${x(marker.day)} ${marker.at - 6} l 6 6 l -6 6 l -6 -6 z`}
                  className={`stroke-ink ${marker.kind === 'overdue' || active === marker.key ? 'fill-ink' : 'fill-white'}`}
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
              )}
              <circle cx={x(marker.day)} cy={marker.at} r="15" fill="transparent" tabIndex={0} role="button" aria-label={aria} className="cursor-pointer outline-none" {...bind(marker.key)} />
            </g>
          );
        })}

        <text x={MARGIN.left} y={HEIGHT - 8} textAnchor="start" className="fill-muted text-[11px]">
          {formatDate(dayNumberToDate(startDay), SHORT)}
        </text>
        <text x={width - MARGIN.right} y={HEIGHT - 8} textAnchor="end" className="fill-muted text-[11px]">
          {formatDate(dayNumberToDate(endDay), SHORT)}
        </text>
      </svg>

      {current && (
        <div
          style={{ left: tipLeft, top: Math.max(0, current.at - 12), transform: 'translate(-50%, -100%)' }}
          className="pointer-events-none absolute z-10 max-w-[220px] rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg"
        >
          <span className="block text-white/70">{current.tip.title}</span>
          {current.tip.lines.map((text, index) => (
            <span key={index} className="mt-0.5 block font-semibold tabular-nums">
              {text}
            </span>
          ))}
          {current.tip.total && <span className="mt-1 block border-t border-white/15 pt-1 tabular-nums text-white/80">{current.tip.total}</span>}
        </div>
      )}
    </div>
  );
}

export default StepChart;
