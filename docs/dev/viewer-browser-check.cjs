// Sandbox-only. vite preview --port 4173, then: node docs/dev/viewer-browser-check.cjs
// A viewer sees no Add buttons on Expenses, Bills and Income; an owner does.
const { chromium } = require('playwright');
const day = new Date().toISOString();
const mk = (role) => ({ id: 'u1', name: 'Ali', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK', role });
const stream = { id: 's1', name: 'Job', incomeType: 'salaried', frequency: 'monthly', expectedAmount: 1000, currency: 'PKR', receivedAt: day, isArchived: false, deductions: [] };
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const role of ['viewer', 'owner']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.route('http://localhost:5000/api/**', (route) => {
      const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
      let body = { success: true, categories: [], loans: [], bills: [], expenses: [], incomeStreams: [], totals: [], receipts: [], opening: null };
      if (path === '/auth/refresh') body = { success: true, user: mk(role), accessToken: 't' };
      else if (path === '/auth/me') body = { success: true, user: mk(role) };
      else if (path === '/fx/rates') body = { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: day };
      else if (path === '/income-streams') body = { success: true, incomeStreams: [stream], streams: [stream] };
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    for (const [url, label] of [['/expenses', 'Add expense'], ['/bills', 'Add bill'], ['/income', 'Add income stream']]) {
      await page.goto(`http://localhost:4173${url}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const n = await page.getByRole('button', { name: new RegExp(`^\\s*${label}`, 'i') }).count();
      if (role === 'viewer' && n > 0) problems.push(`viewer sees "${label}" on ${url}`);
      if (role === 'owner' && n === 0) problems.push(`owner lacks "${label}" on ${url} (check label text)`);
    }
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
