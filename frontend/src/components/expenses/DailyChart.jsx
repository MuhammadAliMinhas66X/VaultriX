import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { useTranslation } from '../../i18n/useTranslation.js';

const compact = (value) => {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(value));
};

function DailyChart({ days, todayDay, perDay, month, money, dayLabel, summary }) {
  const { t } = useTranslation();
  const reduced = useAppReducedMotion();
  const uid = useId().replace(/:/g, '');
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(340);
  const [mode, setMode] = useState('daily');
  const [active, setActive] = useState(null);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;
    const update = () => setWidth(Math.max(240, Math.floor(node.getBoundingClientRect().width)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (active === null) return undefined;
    const away = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setActive(null);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [active]);

  useEffect(() => setActive(null), [month, mode]);

  const size = days.length;
  const height = width < 420 ? 176 : 208;
  const top = 18;
  const bottom = 24;
  const base = height - bottom;
  const innerH = base - top;
  const slot = width / size;
  const barW = Math.max(3, Math.min(slot * 0.58, 22));
  const reach = todayDay === null ? size : todayDay;

  const model = useMemo(() => {
    const maxDay = Math.max(...days.map((item) => item.amount), 0);
    let running = 0;
    const cumulative = days.map((item, index) => {
      if (index + 1 <= reach) running += item.amount;
      return running;
    });
    return { maxDay, cumulative, totalNow: running };
  }, [days, reach]);

  const yDaily = (value) => base - (model.maxDay > 0 ? (value / model.maxDay) * innerH : 0);
  const yTotal = (value) => base - (model.totalNow > 0 ? (value / model.totalNow) * innerH : 0);
  const cx = (index) => index * slot + slot / 2;

  const linePoints = days.slice(0, reach).map((_, index) => [cx(index), yTotal(model.cumulative[index])]);
  const linePath = linePoints.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const areaPath = linePoints.length ? `${linePath} L${linePoints[linePoints.length - 1][0].toFixed(1)} ${base} L${linePoints[0][0].toFixed(1)} ${base} Z` : '';

  const moveTo = (clientX) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const index = Math.max(0, Math.min(size - 1, Math.floor(((clientX - rect.left) / rect.width) * size)));
    setActive(index + 1);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setActive((prev) => Math.min(size, (prev || 0) + 1));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setActive((prev) => Math.max(1, (prev || 2) - 1));
    } else if (event.key === 'Escape') setActive(null);
  };

  const activeDay = active ? days[active - 1] : null;
  const readoutLabel = activeDay ? dayLabel(active) : mode === 'daily' ? t('expenses.chartDaily') : t('expenses.chartTotal');
  const readoutValue = activeDay
    ? mode === 'daily'
      ? activeDay.amount > 0
        ? money(activeDay.amount)
        : t('expenses.nothingSpent')
      : active <= reach
        ? money(model.cumulative[active - 1])
        : '-'
    : t('expenses.chartHint');

  const ticks = [1, 8, 15, 22, size].filter((day, index, list) => list.indexOf(day) === index && (day === size || size - day >= 3));
  const avgY = perDay > 0 && model.maxDay > 0 && perDay <= model.maxDay ? yDaily(perDay) : null;
  const grow = (index) => (reduced ? { duration: 0 } : { duration: 0.55, delay: Math.min(index * 0.014, 0.5), ease: [0.22, 1, 0.36, 1] });

  const tab = (id, label) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={mode === id}
      onClick={() => setMode(id)}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-white/50 ${mode === id ? 'bg-white text-ink' : 'text-white/60 hover:text-white'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="select-none">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0" aria-live="polite">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">{readoutLabel}</p>
          <p className={`mt-1 truncate tabular-nums ${activeDay ? 'text-lg font-bold text-white' : 'text-sm text-white/45'}`}>{readoutValue}</p>
        </div>
        <div role="tablist" className="flex shrink-0 gap-0.5 rounded-full bg-white/10 p-1">
          {tab('daily', t('expenses.chartDaily'))}
          {tab('total', t('expenses.chartTotal'))}
        </div>
      </div>

      <div ref={wrapRef} tabIndex={0} onKeyDown={onKeyDown} role="img" aria-label={summary} className="relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/40">
        <svg key={`${month}-${mode}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block max-w-full overflow-visible text-white">
          <defs>
            <linearGradient id={`bar-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0.38" />
            </linearGradient>
            <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>

          <line x1="0" x2={width} y1={top} y2={top} stroke="#fff" strokeOpacity="0.12" strokeDasharray="3 5" />
          <line x1="0" x2={width} y1={base} y2={base} stroke="#fff" strokeOpacity="0.18" />
          <text x="0" y={top - 6} fill="#fff" fillOpacity="0.45" fontSize="10" fontWeight="600">
            {compact(mode === 'daily' ? model.maxDay : model.totalNow)}
          </text>

          {mode === 'daily' ? (
            <>
              {days.map((item, index) => {
                const x = cx(index) - barW / 2;
                const future = todayDay !== null && item.day > todayDay;
                const dim = active && active !== item.day ? 0.3 : 1;
                if (item.amount <= 0) {
                  return <circle key={item.day} cx={cx(index)} cy={base - 3} r="1.6" fill="#fff" fillOpacity={future ? 0.12 : active === item.day ? 0.8 : 0.35} />;
                }
                const barH = Math.max(4, base - yDaily(item.amount));
                return (
                  <motion.rect
                    key={item.day}
                    x={x}
                    width={barW}
                    rx={Math.min(barW / 2, 5)}
                    fill={`url(#bar-${uid})`}
                    initial={reduced ? false : { y: base, height: 0, opacity: 0 }}
                    animate={{ y: base - barH, height: barH, opacity: dim }}
                    transition={grow(index)}
                  />
                );
              })}
              {avgY !== null && (
                <g>
                  <line x1="0" x2={width} y1={avgY} y2={avgY} stroke="#fff" strokeOpacity="0.4" strokeDasharray="4 4" />
                  <text x={width} y={avgY - 5} textAnchor="end" fill="#fff" fillOpacity="0.6" fontSize="10" fontWeight="600">
                    {t('expenses.chartAvg')} {compact(perDay)}
                  </text>
                </g>
              )}
            </>
          ) : (
            linePoints.length > 0 && (
              <>
                <motion.path d={areaPath} fill={`url(#area-${uid})`} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} />
                <motion.path
                  d={linePath}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={reduced ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
                {(() => {
                  const [ex, ey] = linePoints[linePoints.length - 1];
                  return (
                    <g>
                      <circle cx={ex} cy={ey} r="9" fill="#fff" fillOpacity="0.18" className={reduced ? '' : 'animate-ping'} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
                      <circle cx={ex} cy={ey} r="4.5" fill="#fff" />
                    </g>
                  );
                })()}
              </>
            )
          )}

          {activeDay && (
            <g pointerEvents="none">
              <line x1={cx(active - 1)} x2={cx(active - 1)} y1={top} y2={base} stroke="#fff" strokeOpacity="0.5" />
              {mode === 'total' && active <= reach && <circle cx={cx(active - 1)} cy={yTotal(model.cumulative[active - 1])} r="5" fill="#fff" stroke="#111114" strokeWidth="2" />}
            </g>
          )}

          {ticks.map((day) => (
            <text key={day} x={Math.min(Math.max(cx(day - 1), 6), width - 6)} y={height - 6} textAnchor="middle" fill="#fff" fillOpacity={todayDay === day ? 0.95 : 0.45} fontSize="10" fontWeight={todayDay === day ? 700 : 500}>
              {day}
            </text>
          ))}
          {todayDay !== null && <circle cx={cx(todayDay - 1)} cy={base + 8} r="2" fill="#fff" />}

          <rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill="transparent"
            style={{ touchAction: 'pan-y', cursor: 'crosshair' }}
            onPointerMove={(event) => moveTo(event.clientX)}
            onPointerDown={(event) => moveTo(event.clientX)}
            onPointerLeave={(event) => event.pointerType === 'mouse' && setActive(null)}
          />
        </svg>
      </div>
    </div>
  );
}

export default DailyChart;
