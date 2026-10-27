import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAKISTANI_BANKS, DIGITAL_WALLETS } from '../src/utils/paymentBrands.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../public/logos');
const manifestPath = path.join(outDir, 'index.json');
const MIN_BYTES = 900;
const MIN_WIDTH = 17;

const EXTENSIONS = { 'image/png': 'png', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'image/svg+xml': 'svg', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch (error) {
    return false;
  }
};

const widthOf = (buffer, extension) => {
  if (extension === 'png' && buffer.length > 24 && buffer.toString('ascii', 1, 4) === 'PNG') return buffer.readUInt32BE(16);
  if (extension === 'ico' && buffer.length > 8) {
    const count = buffer.readUInt16LE(4);
    let widest = 0;
    for (let i = 0; i < count && 6 + i * 16 < buffer.length; i += 1) {
      const raw = buffer[6 + i * 16];
      widest = Math.max(widest, raw === 0 ? 256 : raw);
    }
    return widest;
  }
  return 999;
};

const download = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) return null;
    const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const extension = EXTENSIONS[type];
    if (!extension) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < MIN_BYTES || widthOf(buffer, extension) < MIN_WIDTH) return null;
    return { buffer, extension };
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

for (const id of Object.keys(manifest)) {
  const file = path.join(outDir, manifest[id]);
  try {
    const buffer = await readFile(file);
    const extension = path.extname(file).slice(1);
    if (widthOf(buffer, extension) < MIN_WIDTH) delete manifest[id];
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
