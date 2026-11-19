// A Pakistani rupee banknote: rounded note, inner border, corner marks and "Rs" in the middle.
// Same props as a lucide icon so it can replace Banknote anywhere.
export default function RupeeNote({ className = 'h-[18px] w-[18px]', strokeWidth = 1.75 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <rect x="1.8" y="5" width="20.4" height="14" rx="2.6" fill="currentColor" fillOpacity="0.08" />
      <path d="M5.2 8.4h.01M18.8 15.6h.01" strokeWidth={strokeWidth * 1.35} />
      <text x="12" y="14.9" textAnchor="middle" fontSize="7.6" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" fill="currentColor" stroke="none">Rs</text>
    </svg>
  );
}
