import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAKISTANI_BANKS, DIGITAL_WALLETS } from '../src/utils/paymentBrands.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../public/logos');
const manifestPath = path.join(outDir, 'index.json');
const MIN_BYTES = 900;

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
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Mozilla/5.0' } });
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

await mkdir(outDir, { recursive: true });

let manifest = {};
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch (error) {
  manifest = {};
}

const brands = [...PAKISTANI_BANKS, ...DIGITAL_WALLETS];
const missing = [];
let added = 0;

for (const brand of brands) {
  if (manifest[brand.id] && (await exists(path.join(outDir, manifest[brand.id])))) continue;

  let saved = null;
  for (const domain of brand.domains) {
    const urls = [`https://www.google.com/s2/favicons?domain=${domain}&sz=128`, `https://icons.duckduckgo.com/ip3/${domain}.ico`];
    for (const url of urls) {
      const result = await download(url);
      if (result) {
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
