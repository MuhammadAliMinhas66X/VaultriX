import BrandMark from '../../components/BrandMark.jsx';
import { PAKISTANI_BANKS, DIGITAL_WALLETS } from '../../utils/paymentBrands.js';
import { motion } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { Marquee, useTicker } from './ui.jsx';

const items = [
  { method: 'cash', name: '' },
  ...DIGITAL_WALLETS.map((wallet) => ({ method: 'wallet', name: wallet.name })),
  ...PAKISTANI_BANKS.map((bank) => ({ method: 'bank', name: bank.name })),
];

export function LogoStrip() {
  return (
    <Marquee
      items={items.map((item, index) => (
        <span key={`${item.name}-${index}`} title={item.name || 'Cash'} className="block">
          <BrandMark method={item.method} name={item.name} size="lg" />
        </span>
      ))}
      slow
      itemClassName="px-3"
    />
  );
}

export function LogoCluster({ names }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {names.map((name) => (
        <BrandMark key={name} method="bank" name={name} size="md" />
      ))}
    </div>
  );
}

export function LogoPulse({ names, labels }) {
  const reduced = useAppReducedMotion();
  const active = useTicker(names.length, 1500, !reduced);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {names.map((name, index) => {
          const on = index === active && !reduced;
          return (
            <motion.div key={name} animate={{ y: on ? -6 : 0, scale: on ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 380, damping: 20 }} className="relative">
              {on && (
                <motion.span
                  key={active}
                  aria-hidden="true"
                  className="absolute -inset-1.5 rounded-xl border-2 border-ink"
                  initial={{ opacity: 0.9, scale: 0.92 }}
                  animate={{ opacity: 0, scale: 1.4 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              )}
              <span className={`block rounded-xl transition-shadow duration-300 ${on ? 'shadow-[0_14px_26px_-12px_rgba(17,17,20,0.55)]' : ''}`}>
                <BrandMark method="bank" name={name} size="md" />
              </span>
            </motion.div>
          );
        })}
      </div>
      <p className="pf-mono mt-5 h-4 text-[10px] uppercase tracking-[0.16em] text-muted">{labels[active]}</p>
    </div>
  );
}
