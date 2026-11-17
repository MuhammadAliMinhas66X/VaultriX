import { useId } from 'react';

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
};

function Dollar({ cx, cy, scale = 1, strokeWidth }) {
  const k = scale;
  const x = (v) => cx + v * k;
  const y = (v) => cy + v * k;
  return (
    <g strokeWidth={strokeWidth}>
      <path d={`M${x(2.3)} ${y(-2.1)}C${x(1.8)} ${y(-3)} ${x(0.9)} ${y(-3.2)} ${x(0)} ${y(-3.2)}C${x(-1.6)} ${y(-3.2)} ${x(-2.5)} ${y(-2.3)} ${x(-2.5)} ${y(-1.3)}C${x(-2.5)} ${y(-0.2)} ${x(-1.5)} ${y(0.1)} ${x(0)} ${y(0)}C${x(1.5)} ${y(-0.1)} ${x(2.5)} ${y(0.3)} ${x(2.5)} ${y(1.4)}C${x(2.5)} ${y(2.4)} ${x(1.6)} ${y(3.2)} ${x(0)} ${y(3.2)}C${x(-0.9)} ${y(3.2)} ${x(-1.8)} ${y(3)} ${x(-2.3)} ${y(2.1)}`} />
      <path d={`M${x(0)} ${y(-4.6)}V${y(4.6)}`} />
    </g>
  );
}

export function DashboardIcon({ className = '', strokeWidth = 1.75 }) {
  return (
    <svg {...base} strokeWidth={strokeWidth} className={`nav-icon ${className}`}>
      <rect className="ni-d1" x="3" y="3" width="8" height="11" rx="2.4" />
      <rect className="ni-d2" x="13" y="3" width="8" height="6" rx="2.4" />
      <rect className="ni-d3" x="13" y="11.5" width="8" height="9.5" rx="2.4" />
      <rect className="ni-d4" x="3" y="16.5" width="8" height="4.5" rx="2.4" />
    </svg>
  );
}

export function IncomeIcon({ className = '', strokeWidth = 1.75 }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg {...base} strokeWidth={strokeWidth} className={`nav-icon ${className}`}>
      <defs>
        <mask id={`${id}-cut`} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <rect width="24" height="24" fill="white" />
          <circle cx="17.6" cy="17.4" r="6.6" fill="black" />
        </mask>
        <mask id={`${id}-arrow`} maskUnits="userSpaceOnUse" x="12" y="12" width="12" height="12">
          <rect x="12" y="12" width="12" height="12" fill="white" />
          <g className="ni-arrow" fill="none" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.6 15.1v4.6M15.7 17.9l1.9 1.9 1.9-1.9" />
          </g>
        </mask>
      </defs>
      <g mask={`url(#${id}-cut)`}>
        <g className="ni-note">
          <rect x="1.8" y="4.6" width="18.4" height="12.2" rx="2.6" fill="currentColor" fillOpacity="0.1" />
          <Dollar cx={11} cy={10.7} scale={0.9} strokeWidth={strokeWidth * 0.9} />
          <path d="M4.7 8.2h.01M17.3 13.2h.01" strokeWidth={strokeWidth * 1.15} />
        </g>
      </g>
      <g className="ni-badge">
        <circle cx="17.6" cy="17.4" r="4.9" fill="currentColor" stroke="none" mask={`url(#${id}-arrow)`} />
      </g>
    </svg>
  );
}

export function LoansIcon({ className = '', strokeWidth = 1.75 }) {
  return (
    <svg {...base} strokeWidth={strokeWidth} className={`nav-icon ${className}`}>
      <g className="ni-ring">
        <path d="M19.33 6.27A9.3 9.3 0 1 1 8.37 3.44" />
        <path d="M5.47 2.66L8.37 3.44L6.91 6.06" />
      </g>
      <g className="ni-coin">
        <circle cx="12" cy="12" r="5.6" fill="currentColor" fillOpacity="0.1" />
        <Dollar cx={12} cy={12} scale={0.78} strokeWidth={strokeWidth * 0.85} />
      </g>
    </svg>
  );
}

export function ExpenseIcon({ className = '', strokeWidth = 1.75 }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg {...base} strokeWidth={strokeWidth} className={`nav-icon ${className}`}>
      <defs>
        <mask id={`${id}-cut`} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <rect width="24" height="24" fill="white" />
          <circle cx="17.6" cy="17.4" r="6.6" fill="black" />
        </mask>
        <mask id={`${id}-arrow`} maskUnits="userSpaceOnUse" x="12" y="12" width="12" height="12">
          <rect x="12" y="12" width="12" height="12" fill="white" />
          <g className="ni-arrow-up" fill="none" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.6 19.7v-4.6M15.7 16.9l1.9-1.9 1.9 1.9" />
          </g>
        </mask>
      </defs>
      <g mask={`url(#${id}-cut)`}>
        <g className="ni-note">
          <path d="M3.5 2.5h13v18.2l-2.17-1.5-2.16 1.5-2.17-1.5-2.17 1.5-2.16-1.5-2.17 1.5z" fill="currentColor" fillOpacity="0.1" />
          <path d="M6.6 7.2h6.8M6.6 10.8h6.8M6.6 14.4h3.6" strokeWidth={strokeWidth * 0.9} />
        </g>
      </g>
      <g className="ni-badge">
        <circle cx="17.6" cy="17.4" r="4.9" fill="currentColor" stroke="none" mask={`url(#${id}-arrow)`} />
      </g>
    </svg>
  );
}

export function BillsIcon({ className = '', strokeWidth = 1.75 }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg {...base} strokeWidth={strokeWidth} className={`nav-icon ${className}`}>
      <defs>
        <mask id={`${id}-cut`} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <rect width="24" height="24" fill="white" />
          <circle cx="17.6" cy="17.4" r="6.6" fill="black" />
        </mask>
        <mask id={`${id}-tick`} maskUnits="userSpaceOnUse" x="12" y="12" width="12" height="12">
          <rect x="12" y="12" width="12" height="12" fill="white" />
          <g className="ni-arrow" fill="none" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.2 17.6l1.7 1.7 3.1-3.4" />
          </g>
        </mask>
      </defs>
      <g mask={`url(#${id}-cut)`}>
        <g className="ni-note">
          <path d="M5 2.5h9l4.5 4.5v13.5H5z" fill="currentColor" fillOpacity="0.1" />
          <path d="M14 2.5V7h4.5" />
          <path d="M8 11h7M8 14.5h4" strokeWidth={strokeWidth * 0.9} />
        </g>
      </g>
      <g className="ni-badge">
        <circle cx="17.6" cy="17.4" r="4.9" fill="currentColor" stroke="none" mask={`url(#${id}-tick)`} />
      </g>
    </svg>
  );
}

export function SalaryIcon({ className = '', strokeWidth = 1.75 }) {
  return (
    <svg {...base} strokeWidth={strokeWidth} className={`nav-icon ${className}`}>
      <circle cx="12" cy="12" r="9" strokeOpacity="0.22" />
      <g transform="rotate(-90 12 12)"><circle className="ni-ring" cx="12" cy="12" r="9" strokeDasharray="38 18.5" /></g>
      <path className="ni-spark" d="M12 7.6l1.25 3.15L16.4 12l-3.15 1.25L12 16.4l-1.25-3.15L7.6 12l3.15-1.25z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}
