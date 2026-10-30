import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { dayNumberToDate } from '../../utils/loanMath.js';

const HEIGHT = 232;
const MARGIN = { top: 40, right: 16, bottom: 34, left: 48 };
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
  const reduced = useAppReducedMotion();
  const gradientId = useId().replace(/:/g, '');

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
  const finalBalance = points[points.length - 1].balance;
  const finalText = finalBalance <= 0 ? t('loans.paidInFull') : `${t('loans.chartLeft')} ${formatNumber(finalBalance, { notation: 'compact', maximumFractionDigits: 1 })}`;
  const pillWidth = finalText.length * 6.6 + 18;
  const pillY = Math.max(MARGIN.top - 4, Math.min(bottom - 30, y(finalBalance) - 30));
  const drops = points.slice(1).map((point, index) => {
    const before = points[index].balance;
    const nextX = index + 2 < points.length ? x(points[index + 2].day) : x(endDay);
    return { key: `drop${index}`, x: x(point.day), top: y(before), bottom: y(point.balance), amount: before - point.balance, room: nextX - x(point.day) };
  });
  const compact = (value) => formatNumber(value, { notation: 'compact', maximumFractionDigits: 1 });
  const showToday = today >= startDay && today <= endDay;

  const markers = [
    ...points.filter((point) => point.tip).map((point, index) => ({ key: `p${index}`, kind: 'point', day: point.day, at: y(point.balance), tip: point.tip })),
    ...dues.map((due, index) => ({ key: `d${index}`, kind: due.overdue ? 'overdue' : 'due', day: due.day, at: bottom, tip: due.tip })),
  ];
  const rawLabels = [
    ...(showToday ? [{ key: 'today', x: x(today), text: t('loans.chartToday'), due: false }] : []),
    ...dues.map((due, index) => ({ key: `due${index}`, x: x(due.day), text: t('loans.chartDue'), due: true })),
  ].sort((a, b) => a.x - b.x);
  const rowEnds = [-Infinity, -Infinity];
  const labels = [];
  rawLabels.forEach((item) => {
    const half = item.text.length * 3.4;
    const anchor = item.x > width - MARGIN.right - half - 4 ? 'end' : item.x < MARGIN.left + half ? 'start' : 'middle';
    const left = anchor === 'end' ? item.x - half * 2 : anchor === 'start' ? item.x : item.x - half;
    const right = left + half * 2;
    const row = rowEnds.findIndex((end) => left - end >= 8);
    if (row === -1) return;
    rowEnds[row] = right;
    labels.push({ ...item, anchor, y: MARGIN.top - 12 - row * 13 });
  });
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

        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#111114" stopOpacity="0.055" />
            <stop offset="100%" stopColor="#111114" stopOpacity="0" />
          </linearGradient>
        </defs>

        <motion.path d={area} fill={`url(#${gradientId})`} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.25 }} />

        {showToday && <line x1={x(today)} x2={x(today)} y1={MARGIN.top - 6} y2={bottom} className="stroke-muted/70" strokeWidth="1" strokeDasharray="2 3" />}

        {labels.map((item) => (
          <text key={item.key} x={item.x} y={item.y} textAnchor={item.anchor} className={`${item.due ? 'fill-ink font-semibold' : 'fill-muted font-medium'} text-[11px]`}>
            {item.text}
          </text>
        ))}

        {drops.map((drop) => (
          <line key={drop.key} x1={drop.x} x2={drop.x} y1={drop.top} y2={drop.bottom} className="stroke-ink" strokeWidth="5" strokeLinecap="round" opacity="0.1" />
        ))}

        <motion.path
          d={line}
          fill="none"
          className="stroke-ink"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />

        {drops
          .filter((drop) => drop.bottom - drop.top >= 20 && drop.room >= 46)
          .map((drop) => (
            <text key={`${drop.key}-label`} x={drop.x + 8} y={(drop.top + drop.bottom) / 2} dominantBaseline="middle" className="fill-muted text-[10px] font-semibold tabular-nums">
              {`-${compact(drop.amount)}`}
            </text>
          ))}

        <g>
          <rect x={width - MARGIN.right - pillWidth} y={pillY} width={pillWidth} height="22" rx="11" className="fill-ink" />
          <text x={width - MARGIN.right - pillWidth / 2} y={pillY + 11} textAnchor="middle" dominantBaseline="middle" className="fill-white text-[11px] font-semibold tabular-nums">
            {finalText}
          </text>
        </g>

        {markers.map((marker) => {
          const aria = `${marker.tip.title}. ${marker.tip.lines.join(', ')}`;
          return (
            <g key={marker.key}>
              {marker.kind === 'point' ? (
                <>
                  {active === marker.key && <circle cx={x(marker.day)} cy={marker.at} r="10" className="fill-ink" opacity="0.12" />}
                  <circle cx={x(marker.day)} cy={marker.at} r="4.5" className={`stroke-ink ${active === marker.key ? 'fill-ink' : 'fill-white'}`} strokeWidth="2" />
                </>
              ) : (
                <>
                  <line x1={x(marker.day)} x2={x(marker.day)} y1={MARGIN.top - 6} y2={marker.at - 6} className="stroke-ink" strokeWidth="1" strokeDasharray="3 3" opacity={marker.kind === 'overdue' ? 0.7 : 0.35} />
                <path
                  d={`M ${x(marker.day)} ${marker.at - 6} l 6 6 l -6 6 l -6 -6 z`}
                  className={`stroke-ink ${marker.kind === 'overdue' || active === marker.key ? 'fill-ink' : 'fill-white'}`}
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                </>
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
