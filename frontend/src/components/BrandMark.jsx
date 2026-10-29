import { useEffect, useMemo, useState } from 'react';
import { Banknote, Landmark, Smartphone } from 'lucide-react';
import { findBrand } from '../utils/paymentBrands.js';

const SIZES = {
  sm: { box: 'h-8 w-8', icon: 'h-4 w-4', img: 'h-full w-full p-0.5', wide: 'w-full px-0.5', text: 'text-[11px]' },
  md: { box: 'h-12 w-12', icon: 'h-5 w-5', img: 'h-full w-full p-0.5', wide: 'w-full px-1', text: 'text-sm' },
  lg: { box: 'h-16 w-16', icon: 'h-6 w-6', img: 'h-full w-full p-1', wide: 'w-full px-1.5', text: 'text-base' },
};

const MIN_REMOTE_WIDTH = 48;
const SHARP_WIDTH = 96;

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
  const [natural, setNatural] = useState(0);
  const [wide, setWide] = useState(false);
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
    setNatural(0);
    setWide(false);
  }, [name, method]);

  const sources = useMemo(() => (brand && manifest ? sourcesFor(brand, manifest) : []), [brand, manifest]);
  const current = sources[attempt];
  const cap = natural > 0 && natural < SHARP_WIDTH ? natural : 0;
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
            const width = event.currentTarget.naturalWidth;
            const height = event.currentTarget.naturalHeight;
            if (current.startsWith('/logos/') || width >= MIN_REMOTE_WIDTH) {
              setNatural(width);
              setWide(height > 0 && width / height > 1.6);
              setLoaded(true);
            } else {
              setAttempt((prev) => prev + 1);
            }
          }}
          onError={() => setAttempt((prev) => prev + 1)}
          className={`${wide ? dim.wide : dim.img} object-contain`}
          decoding="async"
          style={{ display: loaded ? 'block' : 'none', ...(cap ? { maxWidth: cap, maxHeight: cap } : null) }}
        />
      )}
    </span>
  );
}

export default BrandMark;
