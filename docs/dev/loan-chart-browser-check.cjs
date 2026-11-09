// Sandbox-only check (Playwright is NOT a project dependency). Serve the build first:
//   cd frontend && npx vite build && npx vite preview --port 4173
// then: OUT=/some/dir node docs/dev/loan-chart-browser-check.cjs
// Mocks every /api call, opens a loan with same-day payments and one spread over days on phone and desktop widths,
// fails on horizontal scroll or console errors, and saves screenshots.
const { chromium } = require('playwright');
const out = (process.env.OUT || '.') + '/';
const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00.000Z`; };
const pay = (id, amount, offset, note = '') => ({ id, amount, paidAt: day(offset), payMethod: 'bank', payName: 'Meezan Bank', note, expenseId: 'e' + id, createdAt: day(offset) });
const mk = (id, name, billerId, amount, offsetDue, extra = {}) => ({ id, billerName: name, billerId, categoryId: 'c1', amount, installation: 0, total: amount, paid: 0, remaining: amount, currency: 'PKR', dueAt: day(offsetDue), periodStart: day(offsetDue - 40), periodEnd: day(offsetDue - 10), billerAccount: '0400 1234 5678', payMethod: 'wallet', payName: 'JazzCash', note: '', frequency: 'none', seriesState: 'active', isHead: false, nextBillAt: null, seriesId: id, sequence: 1, cancelledAt: null, createdAt: day(-20), payments: [], ...extra });
const lp = (id, amount, offset) => ({ id, amount, paidAt: day(offset), payMethod: 'cash', payName: '', note: '', proof: null, createdAt: day(offset) });
const loan = (id, name, amount, paidList, extra = {}) => { const paid = paidList.reduce((s, p) => s + p.amount, 0); return { id, direction: 'borrowed', personName: name, amount, currency: 'PKR', sentAt: day(-20), dueAt: null, note: '', receivedMethod: '', receivedName: '', receivedProof: null, payoutName: '', payoutMethod: '', payoutInstitution: '', fromExpense: false, entries: [], entriesTotal: 0, payoutNumber: '', paid, remaining: Math.max(0, amount - paid), done: amount - paid <= 0, payments: paidList, createdAt: day(-20), ...extra }; };
const loans = [
  loan('l1', 'Ahmed Bilal', 800, [lp('a', 400, -0), lp('b', 399, -0), lp('c', 1, -0)], { sentAt: day(0) }),
  loan('l2', 'Sara Khan', 5000, [lp('d', 1500, -12), lp('e', 700, -6), lp('f', 300, -1)], { dueAt: day(10) }),
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
  if (path === '/loans') return { success: true, loans };
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
    for (const [who, tag] of [['Ahmed Bilal', 'same'], ['Sara Khan', 'span']]) {
      await page.goto('http://localhost:4173/loans', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(`text=${who}`, { timeout: 20000 });
      await page.getByText(who).first().click();
      await page.waitForSelector('text=Payments over time, [role=img]', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(900);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) problems.push(`${name} ${tag} overflow ${overflow}px`);
      await page.screenshot({ path: `${out}loan-${tag}-${name}.png`, fullPage: true });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
