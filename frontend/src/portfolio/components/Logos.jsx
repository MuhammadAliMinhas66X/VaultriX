import BrandMark from '../../components/BrandMark.jsx';
import { PAKISTANI_BANKS, DIGITAL_WALLETS } from '../../utils/paymentBrands.js';
import { Marquee } from './ui.jsx';

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
