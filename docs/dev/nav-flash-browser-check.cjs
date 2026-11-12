// Sandbox-only. Serve the build (vite preview --port 4173), then: node docs/dev/nav-flash-browser-check.cjs
// Every API answer is delayed 700 ms. Visits each main page once (to warm it), then clicks through the
// sidebar again and reports any page that shows a loading skeleton / spinner instead of its last content.
const { chromium } = require('playwright');
const user = { id: 'u1', name: 'Test', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK' };
const day = new Date().toISOString().slice(0, 10);
const respond = (url) => {
  const path = new URL(url).pathname.replace(/^\/api/, '');
  if (path === '/auth/refresh') return { success: true, user, accessToken: 'token' };
  if (path === '/auth/me') return { success: true, user };
  if (path === '/fx/rates') return { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: new Date().toISOString() };
  if (path === '/income-streams') return { success: true, incomeStreams: [{ id: 's1', name: 'Salary', expectedAmount: 1000, currency: 'PKR', incomeType: 'salaried', frequency: 'monthly', receivedAt: day, createdAt: day }] };
  if (path === '/expenses') return { success: true, expenses: [{ id: 'e1', amount: 500, currency: 'PKR', categoryId: null, spentAt: day, note: 'Lunch', paidBy: 'self' }] };
  if (path === '/expenses/totals') return { success: true, totals: [] };
  if (path === '/receipts') return { success: true, receipts: [], capped: false };
  if (path === '/receipts/opening') return { success: true, opening: null };
  if (path === '/bills') return { success: true, bills: [{ id: 'b1', billerName: 'IESCO', dueAt: day, total: 100, paid: 0, remaining: 100, currency: 'PKR', cancelledAt: null, payments: [], frequency: 'none' }] };
  if (path === '/loans') return { success: true, loans: [] };
  return { success: true, categories: [] };
};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  await page.route('http://localhost:5000/api/**', async (route) => {
    await new Promise((r) => setTimeout(r, 700));
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respond(route.request().url())) });
  });
  await page.goto('http://localhost:4173/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('nav:visible', { state: 'attached', timeout: 20000 });
  await page.waitForTimeout(2500);
  const hrefs = ['/expenses', '/bills', '/loans', '/dashboard'];
  for (const round of [1, 2]) {
    for (const href of hrefs) {
      await page.locator(`nav:visible a[href="${href}"]`).first().click({ timeout: 8000 }).catch(async () => { await page.screenshot({ path: '/tmp/o/loans-fail.png' }); console.log('NO LINK at', page.url(), (await page.locator('body').innerText()).slice(0, 200)); process.exit(1); });
      await page.waitForTimeout(150);
      const busy = await page.evaluate(() => document.querySelectorAll('.animate-pulse, .animate-spin').length);
      if (round === 2 && busy > 0) problems.push(`${href}: shows a loading placeholder (${busy}) when you come back`);
      await page.waitForTimeout(1800);
    }
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
