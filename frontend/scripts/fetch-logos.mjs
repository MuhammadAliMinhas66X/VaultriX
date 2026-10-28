import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAKISTANI_BANKS, DIGITAL_WALLETS } from '../src/utils/paymentBrands.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../public/logos');
const manifestPath = path.join(outDir, 'index.json');
const force = process.argv.includes('--force');
const MIN_BYTES = 150;
const GOOD_SIZE = 128;
const ENOUGH_SIZE = 180;

const EXTENSIONS = {
  'image/png': 'png',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/svg+xml': 'svg',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const BROWSER = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,*/*',
};

export const sizeOf = (buffer, extension) => {
  try {
    if (extension === 'svg') return Infinity;
    if (extension === 'png') {
      if (buffer.readUInt32BE(0) !== 0x89504e47) return 0;
      return Math.max(buffer.readUInt32BE(16), buffer.readUInt32BE(20));
    }
    if (extension === 'ico') {
      const count = buffer.readUInt16LE(4);
      let best = 0;
      for (let i = 0; i < count; i += 1) {
        const width = buffer[6 + i * 16] || 256;
        const height = buffer[7 + i * 16] || 256;
        best = Math.max(best, width, height);
      }
      return best;
    }
    if (extension === 'jpg') {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) return 0;
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return Math.max(buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 7));
        }
        offset += 2 + length;
      }
      return 0;
    }
    if (extension === 'webp') {
      const kind = buffer.toString('ascii', 12, 16);
      if (kind === 'VP8X') return Math.max(buffer.readUIntLE(24, 3) + 1, buffer.readUIntLE(27, 3) + 1);
      if (kind === 'VP8 ') return Math.max(buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff);
      if (kind === 'VP8L') {
        const bits = buffer.readUInt32LE(21);
        return Math.max((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
      }
    }
  } catch (error) {
    return 0;
  }
  return 0;
};

const download = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: 'follow', headers: BROWSER });
    if (!response.ok) return null;
    const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    let extension = EXTENSIONS[type];
    if (!extension && /\.svg(\?|$)/i.test(url)) extension = 'svg';
    if (!extension) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < MIN_BYTES) return null;
    const official = !/google\.com\/s2\/favicons|icons\.duckduckgo\.com/.test(url);
    const size = sizeOf(buffer, extension);
    return { buffer, extension, size: official ? size : Math.min(size, 48), official };
  } catch (error) {
    return null;
  }
};

const fetchText = async (url, wantHtml) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: 'follow', headers: BROWSER });
    if (!response.ok) return null;
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (wantHtml && !type.includes('html')) return null;
    return { text: await response.text(), base: response.url };
  } catch (error) {
    return null;
  }
};

const attr = (tag, name) => (new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tag) || [])[1];

export const declaredIcons = (html, base) => {
  const found = [];
  let manifest = null;
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = (attr(tag, 'rel') || '').toLowerCase();
    const href = attr(tag, 'href');
    if (!rel || !href) continue;
    if (rel.includes('manifest')) {
      try {
        manifest = new URL(href, base).href;
      } catch (error) {
        manifest = null;
      }
      continue;
    }
    if (!rel.includes('icon')) continue;
    const declared = Number(((/(\d+)x\d+/i.exec(attr(tag, 'sizes') || '')) || [])[1] || 0);
    let score = declared;
    if (rel.includes('apple-touch-icon')) score += 1000;
    if (/\.svg(\?|$)/i.test(href)) score += 2000;
    if (/\.ico(\?|$)/i.test(href)) score -= 200;
    try {
      found.push({ url: new URL(href, base).href, score });
    } catch (error) {
      continue;
    }
  }
  return { icons: found.sort((a, b) => b.score - a.score).map((item) => item.url), manifest };
};

export const manifestIcons = (text, base) => {
  try {
    const data = JSON.parse(text);
    const list = Array.isArray(data.icons) ? data.icons : [];
    return list
      .map((icon) => {
        const sizes = String(icon.sizes || '').split(/\s+/).map((item) => Number(item.split('x')[0]) || 0);
        return { src: icon.src, size: Math.max(0, ...sizes) };
      })
      .filter((icon) => icon.src)
      .sort((a, b) => b.size - a.size)
      .map((icon) => new URL(icon.src, base).href);
  } catch (error) {
    return [];
  }
};

const hash = (buffer) => createHash('sha1').update(buffer).digest('hex');
const googleUrl = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
const duckUrl = (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`;

const knownPaths = (host) => [
  `${host}/apple-touch-icon.png`,
  `${host}/apple-touch-icon-precomposed.png`,
  `${host}/android-chrome-512x512.png`,
  `${host}/android-chrome-192x192.png`,
  `${host}/favicon.svg`,
  `${host}/favicon-196x196.png`,
  `${host}/favicon-96x96.png`,
  `${host}/favicon.ico`,
];

const defaults = new Set();
if (process.argv[1] && process.argv[1].endsWith('fetch-logos.mjs')) {
  for (const url of [googleUrl('no-such-site-vaultrix-check.invalid'), duckUrl('no-such-site-vaultrix-check.invalid')]) {
    const result = await download(url);
    if (result) defaults.add(hash(result.buffer));
  }

  await mkdir(outDir, { recursive: true });

  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    manifest = {};
  }

  const brands = [...PAKISTANI_BANKS, ...DIGITAL_WALLETS];
  const validIds = new Set(brands.map((brand) => brand.id));
  for (const id of Object.keys(manifest)) {
    if (!validIds.has(id)) {
      try {
        await unlink(path.join(outDir, manifest[id]));
      } catch (error) {
        continue;
      }
      delete manifest[id];
    }
  }

  const existingSize = async (id) => {
    if (!manifest[id]) return 0;
    try {
      const buffer = await readFile(path.join(outDir, manifest[id]));
      if (defaults.has(hash(buffer))) return 0;
      return sizeOf(buffer, path.extname(manifest[id]).slice(1).toLowerCase());
    } catch (error) {
      return 0;
    }
  };

  const gather = async (domain) => {
    const urls = [];
    for (const host of [`https://${domain}`, `https://www.${domain}`]) {
      const page = await fetchText(host, true);
      if (!page) continue;
      const { icons, manifest: manifestUrl } = declaredIcons(page.text, page.base);
      urls.push(...icons.slice(0, 5));
      if (manifestUrl) {
        const file = await fetchText(manifestUrl, false);
        if (file) urls.push(...manifestIcons(file.text, file.base).slice(0, 3));
      }
    }
    urls.push(...knownPaths(`https://${domain}`), ...knownPaths(`https://www.${domain}`));
    urls.push(googleUrl(domain), googleUrl(`www.${domain}`), duckUrl(domain), duckUrl(`www.${domain}`));
    return [...new Set(urls)];
  };

  const sharp = [];
  const soft = [];
  const missing = [];
  let changed = 0;

  for (const brand of brands) {
    const current = await existingSize(brand.id);
    if (!force && current >= GOOD_SIZE) {
      sharp.push(brand.name);
      continue;
    }

    let best = null;
    for (const domain of brand.domains) {
      for (const url of await gather(domain)) {
        const result = await download(url);
        if (!result || defaults.has(hash(result.buffer))) continue;
        if (!best || result.size > best.size) best = result;
        if (best.size >= ENOUGH_SIZE) break;
      }
      if (best && best.size >= ENOUGH_SIZE) break;
    }

    if (best && (best.size > current || (force && best.official && best.size >= current))) {
      const fileName = `${brand.id}.${best.extension}`;
      if (manifest[brand.id] && manifest[brand.id] !== fileName) {
        await unlink(path.join(outDir, manifest[brand.id])).catch(() => {});
      }
      await writeFile(path.join(outDir, fileName), best.buffer);
      manifest[brand.id] = fileName;
      changed += 1;
    }

    const finalSize = Math.max(current, best ? best.size : 0);
    if (finalSize === 0) missing.push(brand.name);
    else if (finalSize < GOOD_SIZE) soft.push(`${brand.name} (${finalSize}px)`);
    else sharp.push(brand.name);
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Logos updated: ${changed}. Sharp (${GOOD_SIZE}px or more): ${sharp.length} of ${brands.length}.`);
  if (soft.length) console.log(`Still small, may look soft: ${soft.join(', ')}`);
  if (missing.length) console.log(`No logo found: ${missing.join(', ')}`);
  if (soft.length || missing.length) {
    console.log('For these, save the official logo (PNG 256px or bigger, or SVG) in frontend/public/logos and add it to index.json, for example {"alfalah": "alfalah.png"}.');
  }
}
