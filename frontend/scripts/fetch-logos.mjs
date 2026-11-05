import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAKISTANI_BANKS, DIGITAL_WALLETS } from '../src/utils/paymentBrands.js';
import { BILLERS } from '../src/utils/billers.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SHARP = 128;
const WEAK_CAP = 48;
const VECTOR_SCORE = 5000;
const MIN_BYTES = 150;

const BROWSER = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,image/*,*/*',
};
const WIKI_HEADERS = { 'User-Agent': 'VaultrixLogoFetcher/1.0 (personal finance project)', Accept: 'application/json' };

const WIKI = {
  hbl: { title: 'Habib Bank Limited', match: /hbl|habib.?bank/i },
  ubl: { title: 'United Bank Limited', match: /ubl|united.?bank/i },
  mcb: { title: 'MCB Bank Limited', match: /mcb/i },
  abl: { title: 'Allied Bank Limited', match: /abl|allied/i },
  nbp: { title: 'National Bank of Pakistan', match: /nbp|national.?bank/i },
  alfalah: { title: 'Bank Alfalah', match: /alfalah/i },
  meezan: { title: 'Meezan Bank', match: /meezan/i },
  faysal: { title: 'Faysal Bank', match: /faysal/i },
  askari: { title: 'Askari Bank', match: /askari/i },
  bahl: { title: 'Bank AL Habib', match: /al.?habib|bahl/i },
  soneri: { title: 'Soneri Bank', match: /soneri/i },
  jsbank: { title: 'JS Bank', match: /js.?bank|jsbl/i },
  scb: { title: 'Standard Chartered Pakistan', match: /standard.?chartered|scb/i },
  hmb: { title: 'Habib Metropolitan Bank', match: /metro|hmb/i },
  dib: { title: 'Dubai Islamic Bank Pakistan', match: /dubai.?islamic|dib/i },
  albaraka: { title: 'Al Baraka Bank (Pakistan)', match: /baraka/i },
  bop: { title: 'Bank of Punjab', match: /punjab|bop/i },
  bok: { title: 'Bank of Khyber', match: /khyber|bok/i },
  sindh: { title: 'Sindh Bank', match: /sindh/i },
  fwbl: { title: 'First Women Bank Limited', match: /women|fwbl/i },
  jazzcash: { title: 'JazzCash', match: /jazz.?cash/i },
  easypaisa: { title: 'Easypaisa', match: /easy.?paisa/i },
  nayapay: { title: 'NayaPay', match: /naya.?pay/i },
  sadapay: { title: 'SadaPay', match: /sada.?pay/i },
  upaisa: { title: 'U Microfinance Bank', match: /upaisa|u.?bank|u.?microfinance/i },
  zindigi: { title: 'Zindigi', match: /zindigi/i },
};

const WIKI_SKIP = /commons|wiki|ambox|portal|question|symbol|edit|stub|flag|map|building|office|tower|atm|branch|card|screenshot|old|former|vintage|previous|legacy|ceo|headquarter/i;

const hash = (buffer) => createHash('sha1').update(buffer).digest('hex');

export const sniff = (buffer) => {
  if (!buffer || buffer.length < MIN_BYTES) return null;
  if (buffer.readUInt32BE(0) === 0x89504e47) return 'png';
  if (buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 1 && buffer[3] === 0) return 'ico';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  const head = buffer.toString('utf8', 0, 6000);
  if (/<svg[\s>]/i.test(head) && !/<html|incapsula|captcha|access denied|potrace/i.test(head)) {
    if (/<(path|circle|rect|polygon|ellipse|image|text|use|g)\b/i.test(buffer.toString('utf8'))) return 'svg';
  }
  return null;
};

export const dimensions = (buffer, extension) => {
  try {
    if (extension === 'png') return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
    if (extension === 'ico') {
      const count = buffer.readUInt16LE(4);
      let best = [0, 0];
      for (let i = 0; i < count; i += 1) {
        const width = buffer[6 + i * 16] || 256;
        const height = buffer[7 + i * 16] || 256;
        if (width * height > best[0] * best[1]) best = [width, height];
      }
      return best;
    }
    if (extension === 'jpg') {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) return [0, 0];
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return [buffer.readUInt16BE(offset + 7), buffer.readUInt16BE(offset + 5)];
        }
        offset += 2 + length;
      }
      return [0, 0];
    }
    if (extension === 'webp') {
      const kind = buffer.toString('ascii', 12, 16);
      if (kind === 'VP8X') return [buffer.readUIntLE(24, 3) + 1, buffer.readUIntLE(27, 3) + 1];
      if (kind === 'VP8 ') return [buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff];
      if (kind === 'VP8L') {
        const bits = buffer.readUInt32LE(21);
        return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
      }
    }
  } catch (error) {
    return [0, 0];
  }
  return [0, 0];
};

export const scoreOf = (buffer, extension) => {
  if (extension === 'svg') return VECTOR_SCORE;
  const [width, height] = dimensions(buffer, extension);
  const side = Math.min(Math.min(width, height), 1024);
  return extension === 'ico' ? Math.min(side, 64) : side;
};

const attr = (tag, name) => (new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tag) || [])[1];

const resolve = (href, base) => {
  try {
    return new URL(href, base).href;
  } catch (error) {
    return null;
  }
};

export const declaredIcons = (html, base) => {
  const found = [];
  let manifest = null;
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = (attr(tag, 'rel') || '').toLowerCase();
    const href = attr(tag, 'href');
    if (!rel || !href) continue;
    if (rel.includes('manifest')) {
      manifest = resolve(href, base);
      continue;
    }
    if (!rel.includes('icon')) continue;
    const declared = Number(((/(\d+)x\d+/i.exec(attr(tag, 'sizes') || '')) || [])[1] || 0);
    let score = declared;
    if (rel.includes('apple-touch-icon')) score += 1000;
    if (/\.svg(\?|$)/i.test(href)) score += 2000;
    if (/\.ico(\?|$)/i.test(href)) score -= 200;
    const url = resolve(href, base);
    if (url) found.push({ url, score });
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
      .map((icon) => resolve(icon.src, base))
      .filter(Boolean);
  } catch (error) {
    return [];
  }
};

export const pageLogos = (html, base) => {
  const urls = [];
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const src = attr(tag, 'src') || attr(tag, 'data-src');
    if (!src || /^data:/i.test(src)) continue;
    if (!/logo/i.test(`${src} ${attr(tag, 'alt') || ''} ${attr(tag, 'class') || ''} ${attr(tag, 'id') || ''}`)) continue;
    const url = resolve(src, base);
    if (url) urls.push(url);
  }
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (!/og:image|twitter:image/i.test(tag)) continue;
    const content = attr(tag, 'content');
    if (content && /logo|icon/i.test(content)) {
      const url = resolve(content, base);
      if (url) urls.push(url);
    }
  }
  return [...new Set(urls)].slice(0, 6);
};

export const wikiPick = (pages, match) => {
  const options = [];
  for (const page of Object.values(pages || {})) {
    const info = (page.imageinfo || [])[0];
    if (!info || !info.url) continue;
    const name = String(page.title || '').replace(/^File:/i, '');
    if (!/logo|wordmark|icon/i.test(name) || !match.test(name) || WIKI_SKIP.test(name)) continue;
    const mime = String(info.mime || '');
    const vector = mime === 'image/svg+xml';
    if (!vector && !/^image\/(png|jpeg|webp)$/.test(mime)) continue;
    options.push({ url: info.url, rank: vector ? VECTOR_SCORE : Math.min(info.width || 0, info.height || 0) });
  }
  return options.sort((a, b) => b.rank - a.rank).map((item) => item.url);
};

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

const googleUrl = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
const duckUrl = (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`;
const isWeak = (url) => /google\.com\/s2\/favicons|icons\.duckduckgo\.com/.test(url);

export const run = async ({
  fetchFn = globalThis.fetch,
  outDir = path.resolve(here, '../public/logos'),
  brands = [...PAKISTANI_BANKS, ...DIGITAL_WALLETS, ...BILLERS],
  force = false,
  audit = false,
  log = console.log,
} = {}) => {
  const manifestPath = path.join(outDir, 'index.json');
  const sourcesPath = path.join(outDir, 'sources.json');
  const manualDir = path.join(outDir, 'manual');

  const get = async (url, headers = BROWSER) => {
    try {
      const response = await fetchFn(url, { signal: AbortSignal.timeout(15000), redirect: 'follow', headers });
      if (!response.ok) return null;
      return { response, type: (response.headers.get('content-type') || '').toLowerCase() };
    } catch (error) {
      return null;
    }
  };
  const getText = async (url, headers) => {
    const result = await get(url, headers);
    if (!result) return null;
    return { text: await result.response.text(), base: result.response.url || url, type: result.type };
  };
  const getImage = async (url, headers) => {
    const result = await get(url, headers);
    if (!result) return null;
    const buffer = Buffer.from(await result.response.arrayBuffer());
    const extension = sniff(buffer);
    if (!extension) return null;
    return { buffer, extension, url };
  };

  await mkdir(outDir, { recursive: true });
  await mkdir(manualDir, { recursive: true });

  const defaults = new Set();
  if (!audit) {
    for (const url of [googleUrl('no-such-site-vaultrix-check.invalid'), duckUrl('no-such-site-vaultrix-check.invalid')]) {
      const result = await getImage(url);
      if (result) defaults.add(hash(result.buffer));
    }
  }

  let manifest = {};
  let sources = {};
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    manifest = {};
  }
  try {
    sources = JSON.parse(await readFile(sourcesPath, 'utf8'));
  } catch (error) {
    sources = {};
  }

  const validIds = new Set(brands.map((brand) => brand.id));
  const manual = {};
  for (const name of await readdir(manualDir).catch(() => [])) {
    const id = path.basename(name, path.extname(name));
    if (validIds.has(id) && /\.(png|svg|webp|jpe?g)$/i.test(name)) manual[id] = `manual/${name}`;
  }

  const owners = new Map();
  const existing = {};
  for (const id of Object.keys(manifest)) {
    const file = manifest[id];
    let verdict = null;
    if (!validIds.has(id)) verdict = 'not a listed bank or wallet';
    else {
      try {
        const buffer = await readFile(path.join(outDir, file));
        const extension = sniff(buffer);
        const digest = hash(buffer);
        if (!extension) verdict = 'not a real image';
        else if (defaults.has(digest)) verdict = 'default globe';
        else if (owners.has(digest)) verdict = `same file as ${owners.get(digest)}`;
        else {
          owners.set(digest, id);
          existing[id] = { file, extension, score: scoreOf(buffer, extension), px: dimensions(buffer, extension) };
        }
      } catch (error) {
        verdict = 'file missing';
      }
    }
    if (verdict) {
      log(`Dropped ${id} (${file}): ${verdict}`);
      if (!audit) {
        await unlink(path.join(outDir, file)).catch(() => {});
        delete manifest[id];
        delete sources[id];
      }
    }
  }

  const describe = (score, px) => (score === VECTOR_SCORE ? 'vector' : `${px[0]}x${px[1]}`);

  if (audit) {
    for (const brand of brands) {
      const item = existing[brand.id];
      if (!item) log(`${brand.id.padEnd(11)} NO LOGO (letters shown)`);
      else log(`${brand.id.padEnd(11)} ${item.file.padEnd(16)} ${describe(item.score, item.px).padEnd(10)} ${item.score >= SHARP ? 'sharp' : 'SOFT'}`);
    }
    return { sharp: 0, soft: 0, missing: 0 };
  }

  const gatherWiki = async (brand) => {
    const entry = WIKI[brand.id];
    if (!entry) return [];
    const api =
      'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&generator=images&gimlimit=80' +
      `&prop=imageinfo&iiprop=url|size|mime&titles=${encodeURIComponent(entry.title)}`;
    const result = await getText(api, WIKI_HEADERS);
    if (!result) return [];
    try {
      return wikiPick(JSON.parse(result.text).query?.pages, entry.match).slice(0, 3);
    } catch (error) {
      return [];
    }
  };

  const gatherSite = async (domain) => {
    const urls = [];
    for (const host of [`https://${domain}`, `https://www.${domain}`]) {
      const page = await getText(host);
      if (!page || !page.type.includes('html')) continue;
      const { icons, manifest: manifestUrl } = declaredIcons(page.text, page.base);
      urls.push(...icons.slice(0, 5));
      if (manifestUrl) {
        const file = await getText(manifestUrl);
        if (file) urls.push(...manifestIcons(file.text, file.base).slice(0, 3));
      }
      urls.push(...pageLogos(page.text, page.base));
    }
    urls.push(...knownPaths(`https://${domain}`), ...knownPaths(`https://www.${domain}`));
    return urls;
  };

  const sharp = [];
  const soft = [];
  const missing = [];
  let changed = 0;

  for (const brand of brands) {
    if (manual[brand.id]) {
      manifest[brand.id] = manual[brand.id];
      sources[brand.id] = { from: 'manual', file: manual[brand.id] };
      sharp.push(brand.name);
      continue;
    }

    const have = existing[brand.id];
    const current = have ? have.score : 0;
    if (!force && current >= SHARP) {
      sharp.push(brand.name);
      continue;
    }

    const urls = await gatherWiki(brand);
    for (const domain of brand.domains) urls.push(...(await gatherSite(domain)));
    for (const domain of brand.domains) urls.push(googleUrl(domain), googleUrl(`www.${domain}`), duckUrl(domain), duckUrl(`www.${domain}`));

    let best = null;
    for (const url of [...new Set(urls)]) {
      const wikiHost = /wikimedia\.org/.test(url);
      const image = await getImage(url, wikiHost ? WIKI_HEADERS : BROWSER);
      if (!image) continue;
      const digest = hash(image.buffer);
      if (defaults.has(digest) || (owners.has(digest) && owners.get(digest) !== brand.id)) continue;
      let score = scoreOf(image.buffer, image.extension);
      if (isWeak(url)) score = Math.min(score, WEAK_CAP);
      if (score < 32) continue;
      if (!best || score > best.score) best = { ...image, score, digest };
      if (best.score === VECTOR_SCORE) break;
    }

    if (best && best.score > current) {
      const fileName = `${brand.id}.${best.extension}`;
      if (have && have.file !== fileName) await unlink(path.join(outDir, have.file)).catch(() => {});
      await writeFile(path.join(outDir, fileName), best.buffer);
      manifest[brand.id] = fileName;
      sources[brand.id] = { from: best.url, file: fileName, size: describe(best.score, dimensions(best.buffer, best.extension)) };
      owners.set(best.digest, brand.id);
      changed += 1;
    }

    const finalScore = Math.max(current, best ? best.score : 0);
    if (finalScore === 0) missing.push(brand.name);
    else if (finalScore < SHARP) soft.push(`${brand.name} (${finalScore}px)`);
    else sharp.push(brand.name);
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`);
  log(`Logos updated: ${changed}. Sharp (${SHARP}px or vector): ${sharp.length} of ${brands.length}.`);
  if (soft.length) log(`Still small: ${soft.join(', ')}`);
  if (missing.length) log(`No logo found: ${missing.join(', ')}`);
  if (soft.length || missing.length) {
    log('For these, save the official logo (SVG, or PNG 256px or bigger) as frontend/public/logos/manual/<id>.svg or .png, for example manual/alfalah.png, then run this again.');
  }
  return { sharp: sharp.length, soft: soft.length, missing: missing.length };
};

if (process.argv[1] && process.argv[1].endsWith('fetch-logos.mjs')) {
  await run({ force: process.argv.includes('--force'), audit: process.argv.includes('--audit') });
}
