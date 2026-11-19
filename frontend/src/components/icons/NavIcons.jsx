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
          <text x="11" y="13.4" textAnchor="middle" fontSize="6.6" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" fill="currentColor" stroke="none">Rs</text>
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
      <path className="ni-note" d="M5.5 7.5L15.8 3.6a1 1 0 0 1 1.35.94V7.5" />
      <rect x="3" y="7.5" width="18" height="13" rx="3" fill="currentColor" fillOpacity="0.08" />
      <path d="M21 12.2h-4.2a2.1 2.1 0 0 0 0 4.2H21" />
      <circle className="ni-coin" cx="16.9" cy="14.3" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function GroupsNavIcon({ className = '', strokeWidth = 1.75 }) {
  return (
    <svg {...base} strokeWidth={strokeWidth} className={`nav-icon ${className}`}>
      <circle className="ni-d1" cx="9" cy="8" r="3.4" fill="currentColor" fillOpacity="0.1" />
      <path d="M2.8 20c.4-3.5 3-5.6 6.2-5.6s5.8 2.1 6.2 5.6" />
      <path className="ni-d2" d="M15.6 4.9a3.2 3.2 0 0 1 0 6.2M18.2 14.8c1.8.7 2.8 2.3 3 5.2" />
    </svg>
  );
}

const wrap = (strokeWidth, className, children) => (
  <svg {...base} strokeWidth={strokeWidth} className={`nav-icon ${className}`}>{children}</svg>
);

// Gauge with a needle that swings
export function BudgetsIcon({ className = '', strokeWidth = 1.75 }) {
  return wrap(strokeWidth, className, <>
    <path d="M3.5 17a8.5 8.5 0 0 1 17 0" />
    <path d="M7 17h-3.5M20.5 17H17" />
    <g className="ni-swing"><path d="M12 17l4-5" /></g>
    <circle className="ni-coin" cx="12" cy="17" r="1.3" fill="currentColor" stroke="none" />
    <path d="M7 20.5h10" />
  </>);
}

// Jar where a coin drops in
export function SavingsIcon({ className = '', strokeWidth = 1.75 }) {
  return wrap(strokeWidth, className, <>
    <path d="M6.5 8.5h11l1 2.5v7a2.5 2.5 0 0 1-2.5 2.5H8a2.5 2.5 0 0 1-2.5-2.5v-7z" fill="currentColor" fillOpacity="0.08" />
    <path d="M7 5h10" />
    <circle className="ni-drop" cx="12" cy="3.6" r="1.1" fill="currentColor" stroke="none" />
    <path className="ni-bob" d="M9.5 15.5l1.7 1.7 3.3-3.4" />
  </>);
}

// Three people in a circle that turns
export function CommitteesIcon({ className = '', strokeWidth = 1.75 }) {
  return wrap(strokeWidth, className, <>
    <g className="ni-orbit">
      <circle cx="12" cy="4.6" r="2.1" fill="currentColor" fillOpacity="0.1" />
      <circle cx="5" cy="16.6" r="2.1" fill="currentColor" fillOpacity="0.1" />
      <circle cx="19" cy="16.6" r="2.1" fill="currentColor" fillOpacity="0.1" />
    </g>
    <path d="M9.2 8.2L6.4 14M14.8 8.2L17.6 14M8 17.6h8" strokeOpacity="0.55" />
    <circle className="ni-coin" cx="12" cy="13" r="1.6" fill="currentColor" stroke="none" />
  </>);
}

// Bank with columns that pop
export function AccountsIcon({ className = '', strokeWidth = 1.75 }) {
  return wrap(strokeWidth, className, <>
    <path className="ni-bob" d="M3.5 9.5L12 4l8.5 5.5z" fill="currentColor" fillOpacity="0.08" />
    <path className="ni-d1" d="M6.5 11.5v6" />
    <path className="ni-d2" d="M10.2 11.5v6" />
    <path className="ni-d3" d="M13.8 11.5v6" />
    <path className="ni-d4" d="M17.5 11.5v6" />
    <path d="M4 20h16" />
  </>);
}

// ---- Settings icons ----
export function ProfileIcon({ className = '', strokeWidth = 1.75 }) {
  return wrap(strokeWidth, className, <>
    <circle className="ni-bob" cx="12" cy="8.2" r="3.7" fill="currentColor" fillOpacity="0.08" />
    <path className="ni-d2" d="M4.8 20c.6-3.6 3.4-5.6 7.2-5.6s6.6 2 7.2 5.6" />
  </>);
}

export function SecurityIcon({ className = '', strokeWidth = 1.75 }) {
  return wrap(strokeWidth, className, <>
    <path className="ni-shake" d="M12 3l7.5 2.7v5.6c0 4.4-3 7.6-7.5 9.7-4.5-2.1-7.5-5.3-7.5-9.7V5.7z" fill="currentColor" fillOpacity="0.08" />
    <path className="ni-bob" d="M8.8 12.2l2.2 2.2 4.2-4.4" />
  </>);
}

export function DevicesIcon({ className = '', strokeWidth = 1.75 }) {
  return wrap(strokeWidth, className, <>
    <rect className="ni-sa" x="2.8" y="5" width="13.4" height="9.4" rx="1.9" fill="currentColor" fillOpacity="0.08" />
    <path d="M1.5 18.2h16.2" />
    <rect className="ni-sb" x="16.8" y="9.4" width="5" height="9.2" rx="1.4" />
  </>);
}

export function PreferencesIcon({ className = '', strokeWidth = 1.75 }) {
  return wrap(strokeWidth, className, <>
    <path d="M3.5 7h17M3.5 12h17M3.5 17h17" strokeOpacity="0.45" />
    <circle className="ni-sa" cx="8" cy="7" r="2.2" fill="currentColor" fillOpacity="0.15" />
    <circle className="ni-sb" cx="16" cy="12" r="2.2" fill="currentColor" fillOpacity="0.15" />
    <circle className="ni-sa" cx="10" cy="17" r="2.2" fill="currentColor" fillOpacity="0.15" />
  </>);
}

// Two people and a small plus
export function PeopleIcon({ className = '', strokeWidth = 1.75 }) {
  return wrap(strokeWidth, className, <>
    <circle className="ni-d1" cx="9" cy="8.5" r="3.3" fill="currentColor" fillOpacity="0.08" />
    <path className="ni-d2" d="M2.8 19.5c.5-3.3 3-5 6.2-5s5.7 1.7 6.2 5" />
    <path className="ni-badge" d="M18.5 7.5v5M16 10h5" />
  </>);
}

// Switches for the menu section
export function MenuIcon({ className = '', strokeWidth = 1.75 }) {
  return wrap(strokeWidth, className, <>
    <rect className="ni-sa" x="3" y="4.5" width="18" height="6" rx="3" fill="currentColor" fillOpacity="0.08" />
    <circle className="ni-sb" cx="7" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
    <rect x="3" y="13.5" width="18" height="6" rx="3" />
    <circle className="ni-sa" cx="17" cy="16.5" r="1.4" fill="currentColor" stroke="none" />
  </>);
}

export function DataIcon({ className = '', strokeWidth = 1.75 }) {
  return wrap(strokeWidth, className, <>
    <ellipse className="ni-bob" cx="12" cy="6" rx="7.5" ry="2.8" fill="currentColor" fillOpacity="0.08" />
    <path d="M4.5 6v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6" />
    <path className="ni-d3" d="M4.5 12v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-6" />
  </>);
}

export function DangerIcon({ className = '', strokeWidth = 1.75 }) {
  return wrap(strokeWidth, className, <>
    <path className="ni-shake" d="M12 3.8l9 15.7H3z" fill="currentColor" fillOpacity="0.08" />
    <path d="M12 10v4.2" />
    <circle className="ni-coin" cx="12" cy="17" r="0.7" fill="currentColor" stroke="none" />
  </>);
}
