import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { privacy } from '../content.js';
import { Marquee, Reveal, SectionTag, SplitText } from './ui.jsx';

const loop = (duration, delay = 0) => ({ duration, delay, repeat: Infinity, ease: 'easeInOut' });

function BarsChart({ reduced }) {
  const bars = [48, 70, 38, 82, 56, 90, 44, 66, 52];
  return (
    <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden="true">
      {[22, 45, 68].map((y) => (
        <line key={y} x1="0" x2="200" y1={y} y2={y} stroke="white" strokeOpacity="0.1" />
      ))}
      {bars.map((height, index) => (
        <motion.rect
          key={index}
          x={6 + index * 21}
          width="13"
          rx="1.5"
          fill="white"
          fillOpacity={index === 5 ? 1 : 0.78}
          style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
          y={88 - height * 0.9}
          height={height * 0.9}
          animate={reduced ? undefined : { scaleY: [1, 0.35 + (index % 4) * 0.15, 1] }}
          transition={loop(3.4 + (index % 3) * 0.7, index * 0.12)}
        />
      ))}
    </svg>
  );
}

function LineChart({ reduced }) {
  const d = 'M4 70 C 24 66, 32 38, 52 44 S 84 74, 104 50 S 140 14, 160 30 S 188 36, 196 12';
  return (
    <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden="true">
      {[22, 45, 68].map((y) => (
        <line key={y} x1="0" x2="200" y1={y} y2={y} stroke="white" strokeOpacity="0.1" />
      ))}
      <motion.path d={`${d} L196 90 L4 90 Z`} fill="white" fillOpacity="0.08" animate={reduced ? undefined : { opacity: [0.2, 1, 0.2] }} transition={loop(5)} />
      <motion.path
        d={d}
        fill="none"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={reduced ? undefined : { pathLength: [0, 1, 1, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 0.8, 1] }}
      />
      {[52, 104, 160, 196].map((x, index) => (
        <motion.circle
          key={x}
          cx={x}
          cy={[44, 50, 30, 12][index]}
          r="3"
          fill="#111114"
          stroke="white"
          strokeWidth="1.6"
          animate={reduced ? undefined : { scale: [1, 1.6, 1] }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          transition={loop(3, index * 0.5)}
        />
      ))}
    </svg>
  );
}

function DonutChart({ reduced }) {
  const parts = [
    { dash: ['44 56', '30 70', '44 56'], offset: 0 },
    { dash: ['26 74', '38 62', '26 74'], offset: -48 },
    { dash: ['18 82', '22 78', '18 82'], offset: -78 },
  ];
  return (
    <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden="true">
      <motion.g style={{ transformBox: 'fill-box', transformOrigin: 'center' }} animate={reduced ? undefined : { rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}>
        <circle cx="100" cy="45" r="30" fill="none" stroke="white" strokeOpacity="0.12" strokeWidth="11" />
        {parts.map((part, index) => (
          <motion.circle
            key={index}
            cx="100"
            cy="45"
            r="30"
            fill="none"
            stroke="white"
            strokeOpacity={1 - index * 0.28}
            strokeWidth="11"
            pathLength="100"
            strokeDashoffset={part.offset}
            animate={reduced ? undefined : { strokeDasharray: part.dash }}
            transition={loop(5.5 + index, index * 0.4)}
          />
        ))}
      </motion.g>
      {[14, 36, 58].map((y, index) => (
        <g key={y}>
          <rect x="150" y={y} width={34 - index * 8} height="5" rx="2.5" fill="white" fillOpacity={0.9 - index * 0.25} />
          <rect x="14" y={y + 8} width={22 - index * 5} height="3" rx="1.5" fill="white" fillOpacity="0.25" />
        </g>
      ))}
    </svg>
  );
}

function StepChart({ reduced }) {
  const d = 'M4 14 H40 V30 H70 V30 H70 V46 H104 V58 H138 V58 H138 V72 H196';
  return (
    <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden="true">
      {[22, 45, 68].map((y) => (
        <line key={y} x1="0" x2="200" y1={y} y2={y} stroke="white" strokeOpacity="0.1" />
      ))}
      <path d={`${d} V90 H4 Z`} fill="white" fillOpacity="0.07" />
      <path d={d} fill="none" stroke="white" strokeWidth="2.2" strokeLinejoin="round" />
      <motion.line x1="4" x2="4" y1="6" y2="88" stroke="white" strokeOpacity="0.55" strokeDasharray="2 3" animate={reduced ? undefined : { x: [0, 192, 0] }} transition={loop(7)} />
      <motion.circle r="3.6" cx="0" cy="0" fill="white" initial={{ x: 4, y: 14 }} animate={reduced ? undefined : { x: [4, 40, 70, 104, 138, 196, 4], y: [14, 30, 46, 58, 72, 72, 14] }} transition={{ duration: 7, repeat: Infinity, ease: 'linear' }} />
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
  const { Chart } = room;
  return (
    <Reveal delay={index * 0.1} y={30}>
      <div className="relative overflow-hidden border border-dashed border-white/35 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <span className="pf-mono text-[10px] uppercase tracking-[0.16em] text-white/65">{room.name}</span>
          <Lock className="h-3.5 w-3.5 text-white/80" strokeWidth={1.75} />
        </div>
        <div className="mt-3 h-[clamp(60px,10.5vh,104px)]">
          <Chart reduced={reduced} />
        </div>
        <p className="pf-mono mt-3 text-[10px] uppercase tracking-[0.14em] text-white/45">{room.chart}</p>
      </div>
    </Reveal>
  );
}

function Trust() {
  return (
    <section id="privacy" className="pf-snap-target relative isolate flex min-h-[100svh] scroll-mt-0 items-center overflow-hidden bg-ink text-white">
      <div aria-hidden="true" className="pf-gridlines-dark pf-fade-y pointer-events-none absolute inset-0 -z-10 mx-auto max-w-[1400px]" />
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
