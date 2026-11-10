// Sandbox-only check (Playwright is NOT a project dependency). Serve the build first:
//   cd frontend && npx vite build && npx vite preview --port 4173
// then: OUT=/some/dir node docs/dev/bills-browser-check.cjs
// Mocks every /api call, opens /bills and /dashboard on phone and desktop widths,
// fails on horizontal scroll or console errors, and saves screenshots.
const { chromium } = require('playwright');
const out = (process.env.OUT || '.') + '/';
const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00.000Z`; };
const pay = (id, amount, offset, note = '') => ({ id, amount, paidAt: day(offset), payMethod: 'bank', payName: 'Meezan Bank', note, expenseId: 'e' + id, createdAt: day(offset) });
const mk = (id, name, billerId, amount, offsetDue, extra = {}) => ({ id, billerName: name, billerId, categoryId: 'c1', amount, installation: 0, total: amount, paid: 0, remaining: amount, currency: 'PKR', dueAt: day(offsetDue), periodStart: day(offsetDue - 40), periodEnd: day(offsetDue - 10), billerAccount: '0400 1234 5678', payMethod: 'wallet', payName: 'JazzCash', note: '', frequency: 'none', seriesState: 'active', isHead: false, nextBillAt: null, seriesId: id, sequence: 1, cancelledAt: null, createdAt: day(-20), payments: [], ...extra });
const bills = [
  mk('b1', 'K-Electric', 'kelectric', 18450.5, -3, { frequency: 'monthly', isHead: true, nextBillAt: day(5) }),
  mk('b2', 'SNGPL', 'sngpl', 2300, 0),
  mk('b3', 'StormFiber', 'stormfiber', 4500, 6, { frequency: 'monthly', isHead: true, nextBillAt: day(20), installation: 2500, total: 7000, remaining: 7000 }),
  mk('b4', 'Jazz', 'jazz', 3000, 2, { paid: 1000, remaining: 2000, payments: [pay('p1', 1000, -1, 'First part')] }),
  mk('b5', 'PTCL', 'ptcl', 3600, -12, { paid: 3600, remaining: 0, payments: [pay('p2', 3600, -2)] }),
  mk('b6', 'Some very long company name Pvt Ltd Pakistan Branch', '', 99999.99, 12, { cancelledAt: day(-1), billerAccount: '' }),
];
const user = { id: 'u1', name: 'Muhammad Ali Minhas', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK' };
const stream = { id: 's1', name: 'Main Income', expectedAmount: 62000, currency: 'PKR', incomeType: 'salaried', frequency: 'monthly', receivedAt: day(-5), createdAt: day(-30), destinationMethod: 'cash', destinationName: '', deductFromTotal: false, deductions: [] };
const respond = (url, method) => {
  const path = new URL(url).pathname.replace(/^\/api/, '');
  if (path === '/auth/refresh') return { success: true, user, accessToken: 'token' };
  if (path === '/auth/me') return { success: true, user };
  if (path === '/fx/rates') return { success: true, base: 'PKR', rates: { PKR: 1, USD: 0.0036 }, live: ['USD'], liveAt: new Date().toISOString() };
  if (path === '/income-streams') return { success: true, incomeStreams: [stream] };
  if (path === '/expenses') return { success: true, expenses: [] };
  if (path === '/categories') return { success: true, categories: [{ id: 'c1', name: 'Utilities', type: 'expense', icon: 'bolt', color: '#111114' }, { id: 'c2', name: 'Food', type: 'expense', icon: 'food', color: '#111114' }] };
  if (path === '/loans') return { success: true, loans: [] };
  if (path === '/bills') return { success: true, bills };
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
    await page.route('http://localhost:5000/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respond(route.request().url(), route.request().method())) }));
    await page.goto('http://localhost:4173/bills', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=K-Electric',{timeout:20000});
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) problems.push(`${name} /bills horizontal overflow ${overflow}px`);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}bills-${name}.png`, fullPage: false });
    await page.click('button[aria-label="K-Electric"]');
    await page.waitForSelector('text=Left to pay');
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}bill-detail-${name}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.goto('http://localhost:4173/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Needs attention');
    const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow2 > 0) problems.push(`${name} /dashboard horizontal overflow ${overflow2}px`);
    await page.screenshot({ path: `${out}dash-${name}.png`, fullPage: true });
    await ctx.close();
  }
  console.log(problems.length ? problems.join('\n') : 'no problems');
  await browser.close();
})();
