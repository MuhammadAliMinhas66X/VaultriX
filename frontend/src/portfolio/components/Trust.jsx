import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { privacy } from '../content.js';
import { Marquee, Reveal, SectionTag, SplitText, useTicker } from './ui.jsx';

const ease = [0.22, 1, 0.36, 1];
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// Each chart draws itself once when it scrolls into view, then a single
// highlight steps through it. No constant wobble, so it reads as data.

const Grid = () =>
  [22, 45, 68].map((y) => <line key={y} x1="0" x2="200" y1={y} y2={y} stroke="white" strokeOpacity="0.1" />);

function BarsChart({ reduced, seen }) {
  const bars = [48, 70, 38, 82, 56, 90, 44, 66, 52];
  const show = seen || reduced;
  const peak = useTicker(bars.length, 1100, show && !reduced);
  return (
    <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden="true">
      <Grid />
      {bars.map((height, index) => {
        const tall = height * 0.78;
        const on = index === peak && !reduced;
        return (
          <motion.rect
            key={index}
            x={10 + index * 20}
            y={84 - tall}
            width="12"
            height={tall}
            rx="1"
            fill="white"
            style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
            initial={reduced ? false : { scaleY: 0, fillOpacity: 0.5 }}
            animate={{ scaleY: show ? 1 : 0, fillOpacity: on ? 1 : 0.5 }}
            transition={{ scaleY: { duration: 0.7, delay: index * 0.07, ease }, fillOpacity: { duration: 0.4 } }}
          />
        );
      })}
      <line x1="0" x2="200" y1="84" y2="84" stroke="white" strokeOpacity="0.3" />
    </svg>
  );
}

const linePoints = [
  [6, 66],
  [44, 52],
  [84, 58],
  [124, 34],
  [162, 38],
  [194, 12],
];

function LineChart({ reduced, seen }) {
  const show = seen || reduced;
  const active = useTicker(linePoints.length, 1300, show && !reduced);
  const line = linePoints.map((point) => point.join(',')).join(' ');
  return (
    <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden="true">
      <Grid />
      <motion.polygon points={`${line} 194,84 6,84`} fill="white" initial={reduced ? false : { fillOpacity: 0 }} animate={{ fillOpacity: show ? 0.1 : 0 }} transition={{ duration: 1, delay: 0.9 }} />
      <motion.polyline
        points={line}
        fill="none"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: show ? 1 : 0 }}
        transition={{ duration: 1.8, ease }}
      />
      {linePoints.map(([x, y], index) => {
        const on = index === active && !reduced;
        return (
          <g key={index}>
            <motion.circle cx={x} cy={y} fill="#111114" stroke="white" strokeWidth="1.4" animate={{ r: on ? 4 : 2.6 }} transition={{ duration: 0.35 }} />
            {on && <motion.circle cx={x} cy={y} fill="none" stroke="white" strokeWidth="0.8" initial={{ r: 4, opacity: 0.8 }} animate={{ r: 10, opacity: 0 }} transition={{ duration: 1.1, ease: 'easeOut' }} />}
          </g>
        );
      })}
    </svg>
  );
}

const slices = [
  { key: 'Home', value: 42 },
  { key: 'Food', value: 28 },
  { key: 'Move', value: 18 },
  { key: 'Other', value: 12 },
];

function DonutChart({ reduced, seen }) {
  const show = seen || reduced;
  const active = useTicker(slices.length, 1800, show && !reduced);
  let start = 0;
  return (
    <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden="true">
      <circle cx="45" cy="45" r="30" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="10" />
      <g transform="rotate(-90 45 45)">
        {slices.map((slice, index) => {
          const offset = start;
          start += slice.value;
          const on = index === active && !reduced;
          const length = slice.value - 1.4;
          return (
            <motion.circle
              key={slice.key}
              cx="45"
              cy="45"
              r="30"
              fill="none"
              stroke="white"
              pathLength="100"
              strokeDashoffset={-offset}
              initial={reduced ? false : { strokeDasharray: '0 100', strokeWidth: 10, strokeOpacity: 0.4 }}
              animate={{ strokeDasharray: show ? `${length} ${100 - length}` : '0 100', strokeWidth: on ? 13 : 10, strokeOpacity: on || reduced ? 1 : 0.4 }}
              transition={{ strokeDasharray: { duration: 0.9, delay: index * 0.3, ease }, strokeWidth: { duration: 0.4 }, strokeOpacity: { duration: 0.4 } }}
            />
          );
        })}
      </g>
      <text x="45" y="46" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily={MONO}>
        {slices[active].value}%
      </text>
      <text x="45" y="55" textAnchor="middle" fill="white" fillOpacity="0.55" fontSize="5" fontFamily={MONO} letterSpacing="0.6">
        {slices[active].key.toUpperCase()}
      </text>
      {slices.map((slice, index) => {
        const y = 15 + index * 20;
        const on = index === active && !reduced;
        return (
          <g key={slice.key}>
            <text x="104" y={y} fill="white" fillOpacity={on ? 1 : 0.5} fontSize="5.6" fontFamily={MONO} letterSpacing="0.6">
              {slice.key.toUpperCase()}
            </text>
            <text x="196" y={y} textAnchor="end" fill="white" fillOpacity={on ? 1 : 0.5} fontSize="5.6" fontFamily={MONO}>
              {slice.value}%
            </text>
            <rect x="104" y={y + 4} width="92" height="1.6" fill="white" fillOpacity="0.14" />
            <motion.rect
              x="104"
              y={y + 4}
              height="1.6"
              fill="white"
              initial={reduced ? false : { width: 0 }}
              animate={{ width: show ? (92 * slice.value) / 50 : 0, fillOpacity: on || reduced ? 1 : 0.5 }}
              transition={{ width: { duration: 0.9, delay: 0.3 + index * 0.15, ease }, fillOpacity: { duration: 0.4 } }}
            />
          </g>
        );
      })}
    </svg>
  );
}

const stepEnds = [44, 84, 122, 160, 196];
const stepLevels = [14, 30, 46, 58, 72];
const stepLabels = ['Rs 68,000 left', 'Rs 48,000 left', 'Rs 28,000 left', 'Rs 14,000 left', 'Settled'];
const stepPath = 'M4 14 H44 V30 H84 V46 H122 V58 H160 V72 H196';

function StepChart({ reduced, seen }) {
  const show = seen || reduced;
  const tick = useTicker(7, 1300, show && !reduced);
  const step = reduced ? 4 : Math.min(tick, 4);
  return (
    <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden="true">
      <defs>
        <clipPath id="pf-step-reveal">
          <motion.rect x="0" y="0" height="90" initial={{ width: 0 }} animate={{ width: show ? stepEnds[step] + 4 : 0 }} transition={{ duration: step === 0 ? 0.3 : 0.7, ease }} />
        </clipPath>
      </defs>
      <Grid />
      <path d={stepPath} fill="none" stroke="white" strokeOpacity="0.18" strokeWidth="1.4" strokeDasharray="2 3" />
      <g clipPath="url(#pf-step-reveal)">
        <path d={`${stepPath} V84 H4 Z`} fill="white" fillOpacity="0.09" />
        <path d={stepPath} fill="none" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
      </g>
      <motion.circle r="3.6" fill="white" initial={false} animate={{ cx: stepEnds[step], cy: stepLevels[step] }} transition={{ duration: step === 0 ? 0.3 : 0.7, ease }} />
      <text x="196" y="8" textAnchor="end" fill="white" fillOpacity="0.8" fontSize="5.4" fontFamily={MONO} letterSpacing="0.5">
        {stepLabels[step].toUpperCase()}
      </text>
    </svg>
  );
}

const rooms = [
  { name: 'Organization A', chart: 'Daily spending', Chart: BarsChart },
  { name: 'Organization B', chart: 'Balance over time', Chart: LineChart },
  { name: 'Organization C', chart: 'Spending by category', Chart: DonutChart },
  { name: 'Organization D', chart: 'Loan balance', Chart: StepChart },
];

function Room({ room, index }) {
  const reduced = useAppReducedMotion();
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.35 });
  const { Chart } = room;
  return (
    <Reveal delay={index * 0.1} y={30}>
      <div ref={ref} className="relative overflow-hidden border border-dashed border-white/35 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <span className="pf-mono text-[10px] uppercase tracking-[0.16em] text-white/65">{room.name}</span>
          <Lock className="h-3.5 w-3.5 text-white/80" strokeWidth={1.75} />
        </div>
        <div className="mt-3 h-[clamp(60px,10.5vh,104px)]">
          <Chart reduced={reduced} seen={seen} />
        </div>
        <p className="pf-mono mt-3 text-[10px] uppercase tracking-[0.14em] text-white/45">{room.chart}</p>
      </div>
    </Reveal>
  );
}

function Trust() {
  return (
    <section id="privacy" className="pf-snap-target relative isolate flex min-h-[100svh] scroll-mt-0 items-center overflow-hidden bg-ink text-white">
      <div className="pf-focus-body w-full">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-5 pb-8 pt-24 sm:px-8 lg:grid-cols-12 lg:gap-x-14 lg:gap-y-7 lg:pb-6 lg:pt-20">
          <div className="lg:col-span-6">
            <SectionTag index="03" label="Privacy" dark />
            <h2 className="mt-4 text-[clamp(2.3rem,min(4.6vw,7.2vh),4.6rem)] font-semibold">
              <SplitText text="Your data stays in your organization." />
            </h2>
            <Reveal delay={0.1} className="mt-5 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
              Every organization is its own sealed space. Nothing is shared between them: not totals, not names, not a single entry.
            </Reveal>
          </div>

          <div className="lg:col-span-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {rooms.map((room, index) => (
                <Room key={room.name} room={room} index={index} />
              ))}
            </div>
            <p className="pf-mono mt-4 text-[11px] uppercase tracking-[0.18em] text-white/55">Not shared. Not pooled. Not visible.</p>
          </div>

          <ol className="grid gap-px border border-white/15 bg-white/15 md:grid-cols-3 lg:col-span-12">
            {privacy.map((item, index) => (
              <Reveal as="li" key={item.index} delay={index * 0.1} className="bg-ink p-4 sm:p-5">
                <span className="pf-mono text-[11px] tracking-[0.2em] text-white/50">{item.index}</span>
                <h3 className="mt-2 text-lg font-semibold leading-tight tracking-tight sm:text-xl">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/65">{item.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
        <div className="border-t border-white/15 py-3">
          <Marquee
            items={['No data shared between organizations', 'No data shared between organizations']}
            reverse
            itemClassName="pf-outline pf-outline-light px-10 text-[clamp(1.5rem,min(3.4vw,5vh),2.8rem)] font-semibold tracking-tight after:ms-20 after:content-['/'] after:text-white/30"
          />
        </div>
      </div>
    </section>
  );
}

export default Trust;
