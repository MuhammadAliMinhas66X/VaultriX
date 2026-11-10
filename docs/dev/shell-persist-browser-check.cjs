// Sandbox-only. Serve the build (vite preview --port 4173), then: node docs/dev/shell-persist-browser-check.cjs
// Proves the sidebar is NOT rebuilt when moving between main pages (a marker put on the sidebar must survive).
const { chromium } = require('playwright');
const user = { id: 'u1', name: 'Test', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK' };
const respond = (url) => {
  const path = new URL(url).pathname.replace(/^\/api/, '');
  if (path === '/auth/refresh') return { success: true, user, accessToken: 'token' };
  if (path === '/auth/me') return { success: true, user };
  if (path === '/fx/rates') return { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: new Date().toISOString() };
  if (path === '/income-streams') return { success: true, incomeStreams: [] };
  if (path === '/expenses') return { success: true, expenses: [] };
  if (path === '/categories') return { success: true, categories: [] };
  if (path === '/loans') return { success: true, loans: [] };
  if (path === '/bills') return { success: true, bills: [] };
  return { success: true };
};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 800], ['phone', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    await page.route('http://localhost:5000/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respond(route.request().url())) }));
    await page.goto('http://localhost:4173/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('nav', { state: 'attached', timeout: 20000 });
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelectorAll('nav').forEach((n) => { n.dataset.mark = 'kept'; }));
    const nav = 'nav:visible';
    for (const [name, href] of [['Expenses', '/expenses'], ['Bills', '/bills'], ['Loans', '/loans'], ['Dashboard', '/dashboard']]) {
      await page.locator(`${nav} a[href="${href}"]`).first().click();
      await page.waitForTimeout(500);
      const kept = await page.evaluate(() => [...document.querySelectorAll('nav')].every((n) => n.dataset.mark === 'kept') && document.querySelectorAll('nav').length > 0);
      if (!kept) problems.push(`${tag}: menu was rebuilt after clicking ${name}`);
    }
    const title = await page.evaluate(() => document.title);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
