// The one icon tile used by every Dashboard section and row, so icons are always the same size.
// variant: dark (section headers), ink (needs attention), soft (everything else).
const LOOK = {
  dark: 'bg-gradient-to-br from-ink to-[#3a3a42] text-white shadow-sm',
  ink: 'bg-ink text-white',
  soft: 'bg-surface text-ink',
};

export default function IconTile({ icon: Icon, variant = 'soft', strokeWidth = 1.75, children }) {
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${LOOK[variant]}`}>
      {Icon ? <Icon className="h-[18px] w-[18px]" strokeWidth={strokeWidth} aria-hidden="true" /> : children}
    </span>
  );
}
