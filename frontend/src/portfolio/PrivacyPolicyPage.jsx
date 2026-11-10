import { useEffect } from 'react';
import './portfolio.css';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import { Reveal, SplitText } from './components/ui.jsx';
import { owner } from './content.js';
import { policy } from './policy.js';

function PrivacyPolicyPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Privacy Policy | Vaultrix';
    window.scrollTo(0, 0);
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="pf min-h-screen">
      <Nav home={false} />
      <main>
        <header className="pf-gridlines relative border-b border-border pb-14 pt-32 sm:pt-40">
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
            <p className="pf-mono text-[11px] uppercase tracking-[0.2em] text-muted">Legal</p>
            <h1 className="mt-5 text-[clamp(2.8rem,8vw,7rem)] font-semibold">
              <SplitText text="Privacy Policy" />
            </h1>
            <Reveal delay={0.2} className="mt-7 max-w-2xl text-lg leading-relaxed text-ink/70">
              {policy.intro}
            </Reveal>
            <p className="pf-mono mt-6 text-[11px] uppercase tracking-[0.18em] text-muted">Last updated {policy.updated}</p>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-12">
          <nav aria-label="On this page" className="lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              <p className="pf-mono text-[11px] uppercase tracking-[0.18em] text-muted">On this page</p>
              <ol className="mt-4 space-y-1 border-l border-border">
                {policy.sections.map((section, index) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-ink/65 outline-none transition hover:border-ink hover:text-ink focus-visible:border-ink focus-visible:text-ink">
                      <span className="pf-mono me-3 text-[10px] text-muted">{String(index + 1).padStart(2, '0')}</span>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <div className="space-y-14 lg:col-span-8 lg:col-start-5">
            {policy.sections.map((section, index) => (
              <Reveal as="section" key={section.id} y={24}>
                <div id={section.id} className="scroll-mt-28 border-t border-ink pt-6">
                  <p className="pf-mono text-[11px] tracking-[0.2em] text-muted">{String(index + 1).padStart(2, '0')}</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{section.title}</h2>
                  {section.paragraphs?.map((text) => (
                    <p key={text} className="mt-5 text-[17px] leading-relaxed text-ink/75">
                      {text}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="mt-5 space-y-3">
                      {section.bullets.map((text) => (
                        <li key={text} className="flex gap-3 text-[17px] leading-relaxed text-ink/75">
                          <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                          {text}
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.note && <p className="mt-5 border-l-2 border-ink bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink">{section.note}</p>}
                </div>
              </Reveal>
            ))}

            <Reveal as="section" y={24}>
              <div id="contact" className="scroll-mt-28 border-t border-ink pt-6">
                <p className="pf-mono text-[11px] tracking-[0.2em] text-muted">{String(policy.sections.length + 1).padStart(2, '0')}</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Contact</h2>
                <p className="mt-5 text-[17px] leading-relaxed text-ink/75">
                  Questions about this policy or your data can be sent to the owner of Vaultrix, {owner.name}
                  {owner.email ? (
                    <>
                      {' '}at{' '}
                      <a href={`mailto:${owner.email}`} className="font-medium text-ink underline underline-offset-4">
                        {owner.email}
                      </a>
                      .
                    </>
                  ) : (
                    '.'
                  )}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </main>
      <Footer home={false} />
    </div>
  );
}

export default PrivacyPolicyPage;
