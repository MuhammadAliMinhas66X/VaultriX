import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { IncomeIcon, ExpenseIcon, BillsIcon, LoansIcon, SalaryIcon, BudgetsIcon, SavingsIcon, CommitteesIcon, AccountsIcon, GroupsNavIcon } from '../icons/NavIcons.jsx';
import { useNavPrefs, setNavPref } from '../../hooks/useNavPrefs.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { useTranslation } from '../../i18n/useTranslation.js';

const ITEMS = [
  { id: 'income', name: 'income.headerStream', icon: IncomeIcon, color: '#16a34a' },
  { id: 'expenses', name: 'nav.expenses', icon: ExpenseIcon, color: '#e11d48' },
  { id: 'bills', name: 'nav.bills', icon: BillsIcon, color: '#ea580c' },
  { id: 'loans', name: 'nav.loans', icon: LoansIcon, color: '#7c3aed' },
  { id: 'salary', name: 'nav.salary', icon: SalaryIcon, color: '#0891b2' },
  { id: 'budgets', name: 'nav.budgets', icon: BudgetsIcon, color: '#d97706' },
  { id: 'goals', name: 'nav.goals', icon: SavingsIcon, color: '#2563eb' },
  { id: 'committees', name: 'nav.committees', icon: CommitteesIcon, color: '#db2777' },
  { id: 'accounts', name: 'nav.accounts', icon: AccountsIcon, color: '#0d9488' },
  { id: 'groups', name: 'groups.title', icon: GroupsNavIcon, color: '#4f46e5' },
];

const PALETTE = ['#111114', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#ec4899'];
const rand = (min, max) => min + Math.random() * (max - min);

// Full screen party: the feature name rises, sparks shoot up and confetti falls.
function Celebration({ item, name, onDone }) {
  const { t } = useTranslation();
  const bits = useMemo(
    () =>
      Array.from({ length: 56 }, (_, index) => ({
        id: index,
        x: rand(-46, 46),
        up: rand(28, 78),
        spin: rand(-540, 540),
        size: rand(6, 14),
        delay: rand(0, 0.35),
        color: index % 3 === 0 ? item.color : PALETTE[index % PALETTE.length],
        shape: index % 4,
      })),
    [item]
  );
  return createPortal(
    <motion.div aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onAnimationComplete={() => {}} className="pointer-events-none fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-white/70 backdrop-blur-sm">
      {bits.map((bit) => (
        <motion.span
          key={bit.id}
          aria-hidden="true"
          initial={{ x: `${bit.x * 0.2}vw`, y: '46vh', opacity: 1, scale: 0.4, rotate: 0 }}
          animate={{ x: `${bit.x}vw`, y: [`46vh`, `${-bit.up + 46}vh`, '56vh'], opacity: [1, 1, 0], scale: 1, rotate: bit.spin }}
          transition={{ duration: 2.1, delay: bit.delay, ease: 'easeOut', times: [0, 0.45, 1] }}
          className="absolute left-1/2 top-1/2"
          style={{ width: bit.size, height: bit.shape === 1 ? bit.size * 2.2 : bit.size, background: bit.color, borderRadius: bit.shape === 0 ? '999px' : bit.shape === 2 ? '2px' : '1px', clipPath: bit.shape === 3 ? 'polygon(50% 0, 100% 100%, 0 100%)' : undefined }}
        />
      ))}
      <motion.div initial={{ scale: 0.6, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.1 }} className="relative flex flex-col items-center px-6 text-center">
        <motion.span animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.8, delay: 0.4 }} className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-2xl" style={{ background: item.color }}>
          <item.icon className="h-10 w-10" strokeWidth={1.8} />
        </motion.span>
        <p className="text-4xl font-semibold tracking-tight text-ink sm:text-6xl">{name}</p>
        <p className="mt-2 flex items-center gap-1.5 text-base font-medium text-muted"><Check className="h-4 w-4" />{t('menu.added')}</p>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function Switch({ on, color, label, onChange, calm }) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      whileTap={calm ? undefined : { scale: 0.93 }}
      className="relative h-8 w-14 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <motion.span className="absolute inset-0 rounded-full" animate={{ backgroundColor: on ? color : '#e5e5e7', boxShadow: on ? `0 0 0 4px ${color}22, 0 6px 16px -4px ${color}99` : '0 0 0 0 transparent' }} transition={{ duration: calm ? 0 : 0.3 }} />
      <motion.span layout={!calm} transition={{ type: 'spring', stiffness: 520, damping: 30 }} className={`absolute top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ${on ? 'end-1' : 'start-1'}`}>
        {on && <Check className="h-3.5 w-3.5" style={{ color }} strokeWidth={3} />}
      </motion.span>
    </motion.button>
  );
}

export default function MenuSection() {
  const { t } = useTranslation();
  const prefs = useNavPrefs();
  const calm = Boolean(useAppReducedMotion());
  const [party, setParty] = useState(null);

  const toggle = (item, on) => {
    setNavPref(item.id, on);
    if (!on) return;
    setParty({ item, key: Date.now() });
    window.setTimeout(() => setParty((current) => (current && current.item.id === item.id ? null : current)), calm ? 900 : 2500);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t('menu.hint')}</p>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const on = prefs[item.id];
          return (
            <li key={item.id} className="nav-hover flex items-center gap-3.5 px-4 py-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300" style={{ background: on ? `${item.color}1a` : '#f7f7f8', color: on ? item.color : '#6b6b70' }}>
                <Icon className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{t(item.name)}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{t(`menu.d.${item.id}`)}</p>
              </div>
              <Switch on={on} color={item.color} calm={calm} label={t(item.name)} onChange={(value) => toggle(item, value)} />
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">{t('menu.always')}</p>
      <AnimatePresence>{party && <Celebration key={party.key} item={party.item} name={t(party.item.name)} />}</AnimatePresence>
    </div>
  );
}
