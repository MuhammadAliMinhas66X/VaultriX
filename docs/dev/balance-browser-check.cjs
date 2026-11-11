// Sandbox-only check (Playwright is NOT a project dependency). Serve the build first:
//   cd frontend && npx vite build && npx vite preview --port 4173
// then: OUT=/some/dir node docs/dev/balance-browser-check.cjs
// Mocks every /api call, opens /dashboard and /income (balance overview, opening
// balance sheet, stream receipts) on phone and desktop, fails on horizontal
// scroll or console errors, and saves screenshots. Set OVERSPENT=1 to test the warning.
const { chromium } = require('playwright');
const out = (process.env.OUT || '.') + '/';
const overspent = process.env.OVERSPENT === '1';
const now = new Date();
const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00.000Z`; };
const user = { id: 'u1', name: 'Muhammad Ali Minhas', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK' };
const streams = [
  { id: 's1', name: 'Main Income', expectedAmount: 100000, currency: 'PKR', incomeType: 'salaried', frequency: 'monthly', receivedAt: day(-5), createdAt: day(-90), destinationMethod: 'bank', destinationName: 'Meezan Bank', deductionsEnabled: true, deductFromTotal: true, deductions: [{ name: 'Provident fund', kind: 'percent', value: 5 }] },
  { id: 's2', name: 'Freelance design', expectedAmount: 400, currency: 'USD', incomeType: 'freelance', frequency: 'variable', receivedAt: day(-12), createdAt: day(-60), destinationMethod: 'cash', destinationName: '', deductFromTotal: false, deductions: [] },
];
const receipts = [
  { id: 'r1', streamId: 's1', receivedAt: day(-5), amount: 100000, currency: 'PKR', note: 'Salary', source: 'manual' },
  { id: 'r2', streamId: 's2', receivedAt: day(-12), amount: 400, currency: 'USD', note: 'Logo project', source: 'manual' },
  { id: 'r3', streamId: 's1', receivedAt: day(-35), amount: 100000, currency: 'PKR', note: '', source: 'backfill' },
];
const totals = [
  { month, currency: 'PKR', self: overspent ? 900000 : 42000, other: 8000, repaid: 2000 },
  { month: month === '2026-01' ? '2025-12' : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0') || '12'}`, currency: 'PKR', self: 30000, other: 0, repaid: 0 },
];
const respond = (url) => {
  const path = new URL(url).pathname.replace(/^\/api/, '');
  if (path === '/auth/refresh') return { success: true, user, accessToken: 'token' };
  if (path === '/auth/me') return { success: true, user };
  if (path === '/fx/rates') return { success: true, base: 'PKR', rates: { PKR: 1, USD: 0.0036 }, live: ['USD'], liveAt: new Date().toISOString() };
  if (path === '/income-streams') return { success: true, incomeStreams: streams };
  if (path === '/receipts') return { success: true, receipts, capped: false };
  if (path === '/receipts/opening') return { success: true, opening: { amount: 50000, currency: 'PKR', asOf: day(-80).slice(0, 10) } };
  if (path === '/expenses/totals') return { success: true, totals };
  if (path === '/expenses') return { success: true, expenses: [] };
  if (path === '/bills') return { success: true, bills: [] };
  if (path === '/categories') return { success: true, categories: [] };
  if (path === '/loans') return { success: true, loans: [] };
  return { success: true };
};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [name, w, h] of [['phone', 390, 844], ['desktop', 1280, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${name} pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource|ERR_/.test(m.text())) problems.push(`${name} console: ${m.text()}`); });
    await page.route('http://localhost:5000/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respond(route.request().url())) }));
    await page.goto('http://localhost:4173/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Left this month >> visible=true', { timeout: 20000 });
    await page.waitForTimeout(1800);
    let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) problems.push(`${name} /dashboard horizontal overflow ${overflow}px`);
    await page.screenshot({ path: `${out}bal-dash-${name}.png`, fullPage: true });
    await page.goto('http://localhost:4173/income', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Total balance', { timeout: 20000 });
    await page.waitForTimeout(800);
    overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) problems.push(`${name} /income horizontal overflow ${overflow}px`);
    await page.screenshot({ path: `${out}bal-income-${name}.png`, fullPage: true });
    await page.click('text=Change');
    await page.waitForSelector('text=Money you already had');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}bal-opening-${name}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.click('#stream-s1 button, #stream-s1 [role=button]').catch(() => {});
    await page.waitForSelector('text=Money received', { timeout: 10000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}bal-stream-${name}.png` });
    await ctx.close();
  }
  console.log(problems.length ? problems.join('\n') : 'no problems');
  await browser.close();
})();
