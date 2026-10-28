import { useEffect, useMemo, useState } from 'react';
import { Banknote, Landmark, Smartphone } from 'lucide-react';
import { findBrand } from '../utils/paymentBrands.js';

const SIZES = {
  sm: { box: 'h-7 w-7', icon: 'h-4 w-4', img: 'h-5 w-5', text: 'text-[10px]' },
  md: { box: 'h-11 w-11 sm:h-10 sm:w-10', icon: 'h-5 w-5', img: 'h-8 w-8 sm:h-7 sm:w-7', text: 'text-sm sm:text-xs' },
  lg: { box: 'h-14 w-14', icon: 'h-6 w-6', img: 'h-10 w-10', text: 'text-base' },
};

const MIN_LOGO_WIDTH = 16;

const FALLBACK_ICON = { cash: Banknote, bank: Landmark, wallet: Smartphone };

let manifestPromise = null;
const loadManifest = () => {
  if (!manifestPromise) {
    manifestPromise = fetch('/logos/index.json')
      .then((response) => (response.ok ? response.json() : {}))
      .then((data) => (data && typeof data === 'object' ? data : {}))
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
  const list = [];
  if (manifest[brand.id]) list.push(`/logos/${manifest[brand.id]}`);
  brand.domains.forEach((domain) => {
    list.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
    list.push(`https://www.google.com/s2/favicons?domain=www.${domain}&sz=256`);
  });
  brand.domains.forEach((domain) => {
    list.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
    list.push(`https://icons.duckduckgo.com/ip3/www.${domain}.ico`);
  });
  return list;
};

function BrandMark({ method, name, size = 'md' }) {
  const [manifest, setManifest] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
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
    setLoaded(false);
  }, [name, method]);

  const sources = useMemo(() => (brand && manifest ? sourcesFor(brand, manifest) : []), [brand, manifest]);
  const current = sources[attempt];
  const Fallback = FALLBACK_ICON[method] || Landmark;
  const boxClass = `relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white text-muted ${dim.box}`;

  const placeholder =
    method !== 'cash' && name ? (
      <span className={`${dim.text} font-semibold tracking-tight`}>{initialsOf(name)}</span>
    ) : (
      <Fallback className={dim.icon} />
    );

  return (
    <span className={boxClass}>
      {!loaded && placeholder}
      {current && (
        <img
          key={current}
          src={current}
          alt=""
          referrerPolicy="no-referrer"
          onLoad={(event) => {
            if (current.startsWith('/logos/') || event.currentTarget.naturalWidth > MIN_LOGO_WIDTH) setLoaded(true);
            else setAttempt((prev) => prev + 1);
          }}
          onError={() => setAttempt((prev) => prev + 1)}
          className={`${dim.img} object-contain`}
          decoding="async"
          style={{ display: loaded ? 'block' : 'none' }}
        />
      )}
    </span>
  );
}

export default BrandMark;
