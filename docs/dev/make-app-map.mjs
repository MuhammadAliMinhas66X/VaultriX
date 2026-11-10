// Builds docs/APP-MAP.md from the code (imports, routes, endpoints). No packages.
// Run from the repo root:  node docs/dev/make-app-map.mjs
// A new Claude chat reads that one file instead of the whole codebase.
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';

const root = process.cwd();
const walk = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((name) => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? (name === 'node_modules' ? [] : walk(full)) : /\.(js|jsx|mjs)$/.test(name) ? [full] : [];
}) : []);
const rel = (p) => relative(root, p).split('\\').join('/');
const read = (p) => readFileSync(p, 'utf8');

const files = [...walk(join(root, 'frontend/src')), ...walk(join(root, 'backend/src'))];
const fileSet = new Set(files);
const resolveImport = (from, spec) => {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(from), spec);
  for (const c of [base, `${base}.js`, `${base}.jsx`, join(base, 'index.js'), join(base, 'index.jsx')]) if (fileSet.has(c)) return c;
  return null;
};
const imports = new Map();
const importedBy = new Map();
for (const f of files) {
  const text = read(f);
  const found = new Set();
  for (const m of text.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g)) {
    const target = resolveImport(f, m[1] || m[2] || m[3]);
    if (target) found.add(target);
  }
  imports.set(f, [...found]);
  found.forEach((t) => importedBy.set(t, [...(importedBy.get(t) || []), f]));
}
const name = (f) => basename(f).replace(/\.(jsx?|mjs)$/, '');
const note = (f) => {
  const text = read(f).split('\n').slice(0, 14);
  const line = text.find((l) => /^\s*\/\/\s*\S/.test(l) && !/eslint|@ts/.test(l));
  return line ? line.replace(/^\s*\/\/\s*/, '').slice(0, 110) : '';
};

const FEATURES = {
  bills: ['bill'], expenses: ['expense'], income: ['income', 'salary', 'tax'], loans: ['loan'], categories: ['categor'],
  rates: ['fx', 'rate', 'exchange'], auth: ['auth', 'login', 'signup', 'password', 'mfa', 'google', 'otp'], settings: ['settings', 'user', 'avatar'],
  admin: ['admin'], security: ['security', 'secure', 'session'], accounts: ['account'], dashboard: ['dashboard'],
};
const featureOf = (f) => {
  const n = name(f).toLowerCase();
  for (const [feature, keys] of Object.entries(FEATURES)) if (keys.some((k) => n.includes(k))) return feature;
  return 'shared';
};

// ---- backend: app mounts, routes, controllers, models
const app = read(join(root, 'backend/src/app.js'));
const mounts = [...app.matchAll(/app\.use\(\s*'(\/api\/[\w-]+)'\s*,\s*(\w+)/g)].map((m) => ({ path: m[1], ident: m[2] }));
const appImports = new Map([...app.matchAll(/import\s+(\w+)\s+from\s+'([^']+)'/g)].map((m) => [m[1], resolveImport(join(root, 'backend/src/app.js'), m[2])]));
const backend = mounts.map(({ path, ident }) => {
  const routeFile = appImports.get(ident);
  if (!routeFile) return { path, routes: [], controller: null, models: [] };
  const text = read(routeFile);
  const routes = [...text.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']*)'([^\n]*)/g)].map((m) => `${m[1].toUpperCase()} ${path}${m[2] === '/' ? '' : m[2]}${/canWrite/.test(m[3]) ? '  (write)' : ''}`);
  const controller = imports.get(routeFile).find((t) => /controllers/.test(t)) || null;
  const models = controller ? imports.get(controller).filter((t) => /backend\/src\/models/.test(rel(t))) : [];
  const utils = controller ? imports.get(controller).filter((t) => /backend\/src\/(utils|services)/.test(rel(t))) : [];
  return { path, routeFile, controller, models, utils, routes };
});

// ---- frontend: routes -> pages, pages -> components/services/hooks
const appJsx = read(join(root, 'frontend/src/App.jsx'));
const appJsxImports = new Map([...appJsx.matchAll(/import\s+(\w+)\s+from\s+'([^']+)'/g)].map((m) => [m[1], resolveImport(join(root, 'frontend/src/App.jsx'), m[2])]));
const pageRoutes = [...appJsx.matchAll(/path="([^"]+)"\s+element=\{<(\w+)/g)].map((m) => ({ path: m[1], page: appJsxImports.get(m[2]) })).filter((r) => r.page);
const bucket = (list, re) => list.filter((t) => re.test(rel(t)));
const services = new Map(files.filter((f) => /frontend\/src\/services\/\w+Service\.js$/.test(rel(f))).map((f) => [f, [...read(f).matchAll(/api\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)/g)].map((m) => `${m[1].toUpperCase()} ${m[2].replace(/\$\{[^}]+\}/g, ':id')}`)]));

const out = [];
const L = (s = '') => out.push(s);
L('# APP-MAP (generated, do not edit by hand)');
L('');
L(`Built by \`node docs/dev/make-app-map.mjs\` from the real imports and routes (${files.length} files). Rebuild it after every round. A new chat should read THIS file and CLAUDE.md, then open only the files named here for the feature being changed.`);
L('');
L('## 1. How data flows');
L('');
L('```mermaid');
L('flowchart LR');
L('  U[Browser page] --> C[components + hooks]');
L('  C --> D[data store: useResource]');
L('  D --> S[services/*Service.js]');
L('  S --> R[requestCache + api.js axios]');
L('  R --> A[Express /api routes]');
L('  A --> M[middleware: origin, limits, auth, canWrite]');
L('  M --> K[controllers]');
L('  K --> O[(MongoDB models)]');
L('```');
L('');
L('## 2. Features at a glance (page -> service -> endpoints -> controller -> models)');
L('');
L('```mermaid');
L('flowchart LR');
const feats = new Map();
pageRoutes.forEach((r) => {
  const f = featureOf(r.page);
  const old = feats.get(f) || {};
  feats.set(f, { ...old, page: old.page ? { ...old.page, path: `${old.page.path}  ${r.path}` } : r });
});
backend.forEach((b) => {
  const f = featureOf(b.routeFile || b.path);
  const key = b.path.includes('income') ? 'income' : b.path.includes('fx') ? 'rates' : f;
  feats.set(key, { ...(feats.get(key) || {}), api: b });
});
const idOf = (s) => s.replace(/[^a-z0-9]/gi, '_');
for (const [f, v] of feats) {
  const page = v.page ? `P_${idOf(f)}["${v.page.path}"]` : null;
  const api = v.api ? `A_${idOf(f)}["${v.api.path}"]` : null;
  if (page && api) L(`  ${page} --> ${api}`);
  else if (page) L(`  ${page}`);
  else if (api) L(`  ${api}`);
  if (v.api) {
    if (v.api.controller) L(`  A_${idOf(f)} --> K_${idOf(f)}["${name(v.api.controller)}"]`);
    (v.api.models || []).forEach((m) => L(`  K_${idOf(f)} --> M_${idOf(name(m))}[("${name(m)}")]`));
  }
}
// the dashboard reads other features' data
for (const other of ['income', 'expenses', 'bills', 'rates']) if (feats.get('dashboard')?.page && feats.get(other)?.api) L(`  P_dashboard -. reads .-> A_${other}`);
if (feats.has('bills') && feats.has('expenses')) L('  K_bills -. creates expense per payment .-> K_expenses');
if (feats.has('expenses') && feats.has('loans')) L('  K_expenses -. paid by others creates loan .-> K_loans');
L('```');
L('');
L('## 3. Screens (route -> file -> what it pulls in)');
L('');
for (const r of pageRoutes) {
  const deps = imports.get(r.page) || [];
  const comps = bucket(deps, /components\//).map((t) => name(t));
  const svc = bucket(deps, /services\//).map((t) => name(t));
  const hooks = [...bucket(deps, /(hooks|data)\//).map((t) => name(t))];
  const utils = bucket(deps, /utils\//).map((t) => name(t));
  L(`- \`${r.path}\` -> \`${rel(r.page)}\``);
  if (comps.length) L(`  - components: ${comps.join(', ')}`);
  if (svc.length) L(`  - services: ${svc.join(', ')}`);
  if (hooks.length) L(`  - hooks/data: ${hooks.join(', ')}`);
  if (utils.length) L(`  - utils: ${utils.join(', ')}`);
}
L('- other pages: ' + files.filter((f) => /frontend\/src\/pages\//.test(rel(f)) && !pageRoutes.some((r) => r.page === f)).map(name).join(', '));
L('');
L('## 4. API (what each service calls)');
L('');
for (const [f, calls] of services) if (calls.length) L(`- \`${rel(f)}\`: ${calls.join(' | ')}`);
L('');
L('## 5. Backend routes -> controller -> models and helpers');
L('');
for (const b of backend) {
  L(`### ${b.path}`);
  if (b.controller) L(`- controller \`${rel(b.controller)}\`; models: ${b.models.map(name).join(', ') || 'none'}; helpers: ${(b.utils || []).map(name).join(', ') || 'none'}`);
  b.routes.forEach((r) => L(`- ${r}`));
}
L('');
L('## 6. Data store (frontend/src/data/resources.js)');
L('');
const res = read(join(root, 'frontend/src/data/resources.js'));
[...res.matchAll(/registerResource\('(\w+)'/g)].forEach((m) => L(`- resource \`${m[1]}\``));
[...res.matchAll(/prefix:\s*'([^']+)',\s*invalidates:\s*\[([^\]]*)\]/g)].forEach((m) => L(`- a save to \`${m[1]}\` reloads ${m[2].replace(/'/g, '')}`));
L('');
L('## 7. Models (field names)');
L('');
for (const f of files.filter((p) => /backend\/src\/models\//.test(rel(p)))) {
  const text = read(f);
  const fields = [...text.matchAll(/^\s{4}(\w+):\s*(?:\{|\[|mongoose|String|Number|Boolean|Date)/gm)].map((m) => m[1]).slice(0, 28);
  L(`- \`${name(f)}\`: ${fields.join(', ')}`);
}
L('');
L('## 8. Where is it used (most connected files: change with care)');
L('');
[...importedBy.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 15).forEach(([f, by]) => L(`- \`${rel(f)}\` is imported by ${by.length} files`));
L('');
L('## 9. File index by feature (one line each)');
L('');
const groups = new Map();
for (const f of files) {
  if (/tests?\//.test(rel(f)) || /\.test\./.test(f)) continue;
  const g = featureOf(f);
  groups.set(g, [...(groups.get(g) || []), f]);
}
for (const [g, list] of [...groups.entries()].sort()) {
  L(`### ${g}`);
  list.sort().forEach((f) => L(`- \`${rel(f)}\`${note(f) ? ' - ' + note(f) : ''}  (used by ${(importedBy.get(f) || []).length})`));
}
L('');
writeFileSync(join(root, 'docs/APP-MAP.md'), out.join('\n'));
console.log(`docs/APP-MAP.md written: ${out.length} lines, ${files.length} files.`);
