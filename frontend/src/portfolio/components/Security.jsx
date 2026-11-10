import { Gauge, Lock, MonitorSmartphone, ShieldCheck, Smartphone, ImageOff } from 'lucide-react';
import { security } from '../content.js';
import { Reveal, SectionTag, SplitText } from './ui.jsx';

const icons = [ShieldCheck, Smartphone, MonitorSmartphone, ImageOff, Gauge, Lock];

function Security() {
  return (
    <section id="security" className="pf-snap-target relative flex min-h-[100svh] items-center border-b border-border">
      <div className="pf-focus-body mx-auto w-full max-w-[1400px] px-5 pb-10 pt-24 sm:px-8 lg:pb-6 lg:pt-20">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionTag index="04" label="Security" />
            <h2 className="mt-4 text-[clamp(2.1rem,min(4.2vw,6.6vh),4rem)] font-semibold">
              <SplitText text="Protection you can feel, details you do not need." />
            </h2>
          </div>
          <Reveal delay={0.1} className="self-end text-lg leading-relaxed text-ink/65 lg:col-span-5">
            We describe what protects you, not how it is built. The list below is what you can rely on today.
          </Reveal>
        </div>

        <div className="mt-7 grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-3">
          {security.map((item, index) => {
            const Icon = icons[index];
            return (
              <Reveal key={item.title} delay={(index % 3) * 0.08} y={24}>
                <div className="group relative h-full min-h-[140px] overflow-hidden border-b border-r border-border p-5 transition-colors duration-500 hover:bg-ink hover:text-white sm:p-6">
                  <div className="flex items-start justify-between">
                    <span className="pf-mono text-[11px] tracking-[0.2em] text-muted transition-colors duration-500 group-hover:text-white/60">0{index + 1}</span>
                    <Icon className="h-6 w-6 transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-8deg]" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{item.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink/65 transition-colors duration-500 group-hover:text-white/70">{item.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Security;
