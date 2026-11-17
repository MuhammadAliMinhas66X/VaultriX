// One small button and field system for the salary planner.
// Heights: 36px (sm) in dense rows, 40px (md) for form controls, 44px on phones for form controls.
const base = 'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50';

export const btn = {
  primary: `${base} h-11 bg-ink px-4 text-white hover:bg-black sm:h-10`,
  secondary: `${base} h-9 border border-border bg-white px-3 text-ink hover:border-ink/30 hover:bg-surface`,
  secondaryMd: `${base} h-11 border border-border bg-white px-4 text-ink hover:border-ink/30 hover:bg-surface sm:h-10`,
  ghost: `${base} h-9 px-3 text-muted hover:bg-surface hover:text-ink`,
  icon: `${base} h-9 w-9 text-muted hover:bg-surface hover:text-ink`,
  danger: `${base} h-9 bg-ink px-3 text-white hover:bg-black`,
  dangerIcon: `${base} h-9 w-9 text-muted hover:bg-surface hover:text-ink`,
};

export const inputClass = (invalid) =>
  `h-11 w-full rounded-lg border bg-white px-3 text-base text-ink outline-none transition placeholder:text-muted/70 hover:border-ink/30 focus:ring-2 sm:h-10 sm:text-sm disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted ${
    invalid ? 'border-ink ring-1 ring-ink/10 focus:border-ink focus:ring-ink/15' : 'border-border focus:border-accent focus:ring-accent/20'
  }`;

export const card = 'rounded-xl border border-border bg-white';
export const money = (formatMoney, currency) => (value) => formatMoney(value, { decimals: 0, maxDecimals: 2, currency });
