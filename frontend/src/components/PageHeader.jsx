// Title, one line of help, and an optional action (button, month switcher) for a main page.
export default function PageHeader({ title, tagline, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {tagline && <p className="mt-1 max-w-xl text-sm text-muted">{tagline}</p>}
      </div>
      {children}
    </div>
  );
}

export const pageWidth = 'mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8';
