import { languages } from '../content.js';
import { Marquee, Reveal } from './ui.jsx';

const facts = [
  { title: 'Six languages', body: 'Arabic and Urdu read right to left, the way they should.' },
  { title: 'Made for your banks', body: 'Pick cash, a bank or a wallet for every payment in and out.' },
  { title: 'Every screen size', body: 'The same app on a phone, a tablet and a desktop.' },
  { title: 'Calm by choice', body: 'Animations switch off when you ask, or when your device does.' },
];

function Details() {
  return (
    <section className="relative border-b border-border bg-surface">
      <div className="border-b border-border py-8">
        <Marquee items={languages} slow itemClassName="px-10 text-[clamp(2.6rem,7vw,6rem)] font-semibold tracking-tight after:ms-20 after:content-['/'] after:text-ink/20" />
      </div>
      <div className="mx-auto grid max-w-[1400px] divide-border sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
        {facts.map((fact, index) => (
          <Reveal key={fact.title} delay={index * 0.08} className="border-b border-border p-6 sm:p-8 lg:border-b-0">
            <p className="text-xl font-semibold leading-tight tracking-tight">{fact.title}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink/65">{fact.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default Details;
