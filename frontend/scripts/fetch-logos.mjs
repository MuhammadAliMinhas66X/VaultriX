import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAKISTANI_BANKS, DIGITAL_WALLETS } from '../src/utils/paymentBrands.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../public/logos');
const manifestPath = path.join(outDir, 'index.json');
const force = process.argv.includes('--force');
const MIN_BYTES = 150;

const EXTENSIONS = { 'image/png': 'png', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'image/svg+xml': 'svg', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch (error) {
    return false;
  }
};

const download = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) return null;
    const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const extension = EXTENSIONS[type];
    if (!extension) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.length >= MIN_BYTES ? { buffer, extension } : null;
  } catch (error) {
    return null;
  }
};

const BROWSER = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', Accept: 'text/html,*/*' };

const fetchPage = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: 'follow', headers: BROWSER });
    if (!response.ok) return null;
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (!type.includes('html')) return null;
    return { html: await response.text(), base: response.url };
  } catch (error) {
    return null;
  }
};

const declaredIcons = (html, base) => {
  const found = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = (/rel\s*=\s*["']([^"']+)["']/i.exec(tag) || [])[1];
    const href = (/href\s*=\s*["']([^"']+)["']/i.exec(tag) || [])[1];
    if (!rel || !href || !rel.toLowerCase().includes('icon')) continue;
    const size = Number(((/sizes\s*=\s*["'](\d+)x\d+["']/i.exec(tag) || [])[1]) || 0);
    let score = rel.toLowerCase().includes('apple-touch-icon') ? 1000 : 0;
    score += size;
    if (/\.svg(\?|$)/i.test(href)) score += 900;
    if (/\.ico(\?|$)/i.test(href)) score -= 200;
    try {
      found.push({ url: new URL(href, base).href, score });
    } catch (error) {
      continue;
    }
  }
  return found.sort((a, b) => b.score - a.score).map((item) => item.url);
};

const hash = (buffer) => createHash('sha1').update(buffer).digest('hex');

const googleUrl = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
const duckUrl = (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`;

const defaults = new Set();
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

if (force) {
  for (const id of Object.keys(manifest)) {
    try {
      await unlink(path.join(outDir, manifest[id]));
    } catch (error) {
      continue;
    }
  }
  manifest = {};
}

const brands = [...PAKISTANI_BANKS, ...DIGITAL_WALLETS];

for (const id of Object.keys(manifest)) {
  const file = path.join(outDir, manifest[id]);
  try {
    const buffer = await readFile(file);
    if (defaults.has(hash(buffer))) delete manifest[id];
  } catch (error) {
    delete manifest[id];
  }
}

const missing = [];
let added = 0;

for (const brand of brands) {
  if (manifest[brand.id] && (await exists(path.join(outDir, manifest[brand.id])))) continue;

  let saved = null;
  for (const domain of brand.domains) {
    const urls = [];
    for (const host of [`https://${domain}`, `https://www.${domain}`]) {
      const page = await fetchPage(host);
      if (page) urls.push(...declaredIcons(page.html, page.base).slice(0, 4));
    }
    urls.push(`https://${domain}/apple-touch-icon.png`, `https://www.${domain}/apple-touch-icon.png`, `https://${domain}/favicon.ico`, `https://www.${domain}/favicon.ico`, googleUrl(domain), `https://www.google.com/s2/favicons?domain=www.${domain}&sz=256`, duckUrl(domain), duckUrl(`www.${domain}`));
    for (const url of urls) {
      const result = await download(url);
      if (result && !defaults.has(hash(result.buffer))) {
        saved = result;
        break;
      }
    }
    if (saved) break;
  }

  if (saved) {
    const fileName = `${brand.id}.${saved.extension}`;
    await writeFile(path.join(outDir, fileName), saved.buffer);
    manifest[brand.id] = fileName;
    added += 1;
  } else {
    missing.push(brand.name);
  }
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Logos saved: ${added} new, ${Object.keys(manifest).length} total of ${brands.length}.`);
if (missing.length) console.log(`No logo found for: ${missing.join(', ')}`);
