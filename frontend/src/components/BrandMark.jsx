import { useEffect, useMemo, useState } from 'react';
import { Banknote, Landmark, Smartphone } from 'lucide-react';
import { findBrand } from '../utils/paymentBrands.js';

const SIZES = {
  sm: { box: 'h-6 w-6', icon: 'h-3.5 w-3.5', img: 'h-4 w-4', text: 'text-[10px]' },
  md: { box: 'h-9 w-9', icon: 'h-5 w-5', img: 'h-6 w-6', text: 'text-xs' },
};

const FALLBACK_ICON = { cash: Banknote, bank: Landmark, wallet: Smartphone };

let manifestPromise = null;
const loadManifest = () => {
  if (!manifestPromise) {
    manifestPromise = fetch('/logos/index.json')
      .then((response) => (response.ok ? response.json() : {}))
      .catch(() => ({}));
  }
  return manifestPromise;
};

const initialsOf = (name) =>
  String(name || '')
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

const sourcesFor = (brand, manifest) => {
  if (!brand) return [];
  const list = [];
  if (manifest[brand.id]) list.push(`/logos/${manifest[brand.id]}`);
  brand.domains.forEach((domain) => {
    list.push(`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&nfrd=1&url=https://${domain}&size=64`);
    list.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
  });
  return list;
};

function BrandMark({ method, name, size = 'md' }) {
  const [manifest, setManifest] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const dim = SIZES[size];
  const brand = method === 'cash' ? null : findBrand(name);

  useEffect(() => {
    let active = true;
    if (brand) loadManifest().then((data) => active && setManifest(data));
    return () => {
      active = false;
    };
  }, [brand]);

  useEffect(() => {
    setAttempt(0);
  }, [name, method]);

  const sources = useMemo(() => sourcesFor(brand, manifest || {}), [brand, manifest]);
  const Fallback = FALLBACK_ICON[method] || Landmark;
  const boxClass = `flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white text-muted ${dim.box}`;

  if (brand && manifest && attempt < sources.length) {
    return (
      <span className={boxClass}>
        <img
          key={sources[attempt]}
          src={sources[attempt]}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setAttempt((prev) => prev + 1)}
          className={`${dim.img} object-contain`}
        />
      </span>
    );
  }

  if (method !== 'cash' && name && (!brand || manifest)) {
    return <span className={`${boxClass} ${dim.text} font-semibold tracking-tight`}>{initialsOf(name)}</span>;
  }

  return (
    <span className={boxClass}>
      <Fallback className={dim.icon} />
    </span>
  );
}

export default BrandMark;
