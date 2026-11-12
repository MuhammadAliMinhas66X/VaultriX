// Sandbox-only. Serve the build (vite preview --port 4173), then: node docs/dev/expense-filter-browser-check.cjs
// Checks the category filter icon on Expenses (phone + desktop) and that picking a category filters the list.
const { chromium } = require('playwright');
const user = { id: 'u1', name: 'Test', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK' };
const day = new Date().toISOString().slice(0, 10);
const cats = [
  { id: 'c1', name: 'Food', type: 'expense', icon: 'food' },
  { id: 'c2', name: 'Internet', type: 'expense', icon: 'internet' },
];
const expenses = [
  { id: 'e1', amount: 500, currency: 'PKR', categoryId: 'c1', spentAt: day, note: 'Lunch', paidBy: 'self' },
  { id: 'e2', amount: 3000, currency: 'PKR', categoryId: 'c2', spentAt: day, note: 'Wifi', paidBy: 'self' },
];
const respond = (url) => {
  const path = new URL(url).pathname.replace(/^\/api/, '');
  if (path === '/auth/refresh') return { success: true, user, accessToken: 'token' };
  if (path === '/auth/me') return { success: true, user };
  if (path === '/fx/rates') return { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: new Date().toISOString() };
  if (path === '/expenses') return { success: true, expenses };
  if (path === '/categories') return { success: true, categories: cats };
  return { success: true, incomeStreams: [], loans: [], bills: [] };
};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 800], ['phone', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    await page.route('http://localhost:5000/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respond(route.request().url())) }));
    await page.goto('http://localhost:4173/expenses', { waitUntil: 'domcontentloaded' });
    const btn = page.locator('button[aria-label="Filter by category"]');
    await btn.waitFor({ timeout: 20000 });
    await btn.click();
    await page.waitForTimeout(400);
    await btn.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, 300)); await page.screenshot({ path: `/tmp/o/filter-${tag}.png` });
    await page.locator('[role="menuitemradio"]', { hasText: 'Internet' }).click();
    await page.waitForTimeout(300);
    const text = await page.locator('main, body').first().innerText();
    if (!text.includes('Wifi')) problems.push(`${tag}: Wifi expense missing after filter`);
    if (text.includes('Lunch')) problems.push(`${tag}: Lunch still shown after filtering to Internet`);
    const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (over) problems.push(`${tag}: horizontal scroll`);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
