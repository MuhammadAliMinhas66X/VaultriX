import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { privacy } from '../content.js';
import { Marquee, Reveal, SectionTag, SplitText } from './ui.jsx';

const rooms = [
  { name: 'Organization A', bars: [62, 38, 80, 48], seconds: 5.2 },
  { name: 'Organization B', bars: [44, 76, 30, 66], seconds: 6.4 },
  { name: 'Organization C', bars: [70, 52, 36, 84], seconds: 5.8 },
  { name: 'Organization D', bars: [34, 58, 72, 42], seconds: 7 },
];

function Room({ room, index }) {
  const reduced = useAppReducedMotion();
  return (
    <Reveal delay={index * 0.1} y={30}>
      <div className="relative overflow-hidden border border-dashed border-white/35 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <span className="pf-mono text-[10px] uppercase tracking-[0.16em] text-white/60">{room.name}</span>
          <Lock className="h-3.5 w-3.5 text-white/80" strokeWidth={1.75} />
        </div>
        <div className="mt-5 flex h-20 items-end gap-1.5 sm:h-24">
          {room.bars.map((height, barIndex) => (
            <motion.span
              key={barIndex}
              className="w-full bg-white/85"
              style={{ height: `${height}%`, transformOrigin: 'bottom' }}
              animate={reduced ? undefined : { scaleY: [1, 0.55 + (barIndex % 3) * 0.12, 1] }}
              transition={{ duration: room.seconds + barIndex * 0.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <motion.span
          aria-hidden="true"
          className="absolute bottom-4 left-4 h-1.5 w-1.5 rounded-full bg-white"
          animate={reduced ? undefined : { x: [0, 46, 0], y: [0, -26, 0] }}
          transition={{ duration: room.seconds, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span aria-hidden="true" className="pf-mono absolute bottom-3 right-4 text-[10px] text-white/45">
          x
        </span>
      </div>
    </Reveal>
  );
}

function Trust() {
  return (
    <section id="privacy" className="relative isolate scroll-mt-20 overflow-hidden bg-ink text-white">
      <div aria-hidden="true" className="pf-gridlines-dark pf-fade-y pointer-events-none absolute inset-0 -z-10 mx-auto max-w-[1400px]" />
      <div className="mx-auto grid max-w-[1400px] gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <SectionTag index="03" label="Privacy" dark />
          <h2 className="mt-6 text-[clamp(2.6rem,6.6vw,5.8rem)] font-semibold">
            <SplitText text="Your data stays in your organization." />
          </h2>
          <Reveal delay={0.1} className="mt-7 max-w-lg text-lg leading-relaxed text-white/70">
            Every organization is its own sealed space. Nothing is shared between them: not totals, not names, not a single entry.
          </Reveal>
        </div>

        <div className="lg:col-span-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {rooms.map((room, index) => (
              <Room key={room.name} room={room} index={index} />
            ))}
          </div>
          <p className="pf-mono mt-5 text-[11px] uppercase tracking-[0.18em] text-white/55">Not shared. Not pooled. Not visible.</p>
        </div>

        <ol className="grid gap-px border border-white/15 bg-white/15 md:grid-cols-3 lg:col-span-12">
          {privacy.map((item, index) => (
            <Reveal as="li" key={item.index} delay={index * 0.1} className="bg-ink p-6 sm:p-8">
              <span className="pf-mono text-[11px] tracking-[0.2em] text-white/50">{item.index}</span>
              <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-tight">{item.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/65">{item.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
      <div className="border-t border-white/15 py-6">
        <Marquee
          items={['No data shared between organizations', 'No data shared between organizations']}
          reverse
          itemClassName="pf-outline pf-outline-light px-10 text-[clamp(2.4rem,6vw,5rem)] font-semibold tracking-tight after:ms-20 after:content-['/'] after:text-white/30"
        />
      </div>
    </section>
  );
}

export default Trust;
