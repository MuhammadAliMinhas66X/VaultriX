// Sandbox-only. vite preview --port 4173, then: OUT=/tmp/x/ node docs/dev/accounts-browser-check.cjs
// Reports > Accounts tab: totals per currency, add, edit, archive, delete. Checks the sent payloads.
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const day = new Date().toISOString();
const user = { id: 'u1', name: 'Ali', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK', role: 'owner' };
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 900], ['phone', 390, 844]]) {
    let accounts = [
      { id: 'a1', name: 'Cash', type: 'cash', currency: 'PKR', balance: 12000, color: '#111114', isArchived: false },
      { id: 'a2', name: 'Dollar jar', type: 'savings', currency: 'USD', balance: 250, color: '#f5a83a', isArchived: false },
    ];
    const sent = [];
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    await page.route('http://localhost:5000/api/**', (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, '');
      let body = { success: true, categories: [], loans: [], bills: [], expenses: [], incomeStreams: [], totals: [], receipts: [], opening: null };
      if (path === '/auth/refresh' || path === '/auth/me') body = { success: true, user, accessToken: 't' };
      else if (path === '/fx/rates') body = { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: day };
      else if (path === '/accounts' && req.method() === 'GET') {
        const withArchived = url.searchParams.get('includeArchived') === 'true';
        const list = accounts.filter((a) => withArchived || !a.isArchived);
        const sums = {};
        accounts.filter((a) => !a.isArchived).forEach((a) => { sums[a.currency] = (sums[a.currency] || 0) + a.balance; });
        body = { success: true, accounts: list, totals: Object.entries(sums).map(([currency, total]) => ({ currency, total })) };
      } else if (path === '/accounts' && req.method() === 'POST') {
        const payload = JSON.parse(req.postData() || '{}');
        sent.push({ method: 'POST', ...payload });
        accounts.push({ id: `n${accounts.length}`, isArchived: false, ...payload });
        body = { success: true, account: accounts[accounts.length - 1] };
      } else if (path.startsWith('/accounts/') && req.method() === 'PATCH') {
        const payload = JSON.parse(req.postData() || '{}');
        sent.push({ method: 'PATCH', ...payload });
        accounts = accounts.map((a) => (a.id === path.split('/')[2] ? { ...a, ...payload } : a));
        body = { success: true, account: accounts[0] };
      } else if (path.startsWith('/accounts/') && req.method() === 'DELETE') {
        sent.push({ method: 'DELETE' });
        accounts = accounts.filter((a) => a.id !== path.split('/')[2]);
      }
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto('http://localhost:4173/reports?tab=accounts', { waitUntil: 'domcontentloaded' });
    await page.getByText('Dollar jar').waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}accounts-${tag}.png`, fullPage: true });
    if (await page.getByText('Total · USD').count() !== 1) problems.push(`${tag}: USD total card missing`);

    await page.getByRole('button', { name: 'Add account' }).first().click();
    await page.getByPlaceholder('Cash, bank, savings...').fill('Bank');
    await page.getByLabel('Balance').fill('50000');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByText('Bank', { exact: true }).first().waitFor({ timeout: 5000 }).catch(() => problems.push(`${tag}: new account not listed`));
    const created = sent.find((item) => item.method === 'POST');
    if (!created || created.name !== 'Bank' || created.balance !== 50000 || created.currency !== 'PKR') problems.push(`${tag}: create payload wrong ${JSON.stringify(created)}`);

    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByLabel('Balance').fill('15000');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);
    const edited = sent.filter((item) => item.method === 'PATCH').pop();
    if (!edited || edited.balance !== 15000) problems.push(`${tag}: edit payload wrong ${JSON.stringify(edited)}`);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('button', { name: 'Archive', exact: true }).first().click();
    await page.waitForTimeout(500);
    const archived = sent.filter((item) => item.method === 'PATCH').pop();
    if (!archived || archived.isArchived !== true) problems.push(`${tag}: archive payload wrong ${JSON.stringify(archived)}`);

    await page.getByRole('button', { name: 'Show archived' }).click();
    await page.getByText('Archived', { exact: false }).first().waitFor({ timeout: 5000 }).catch(() => problems.push(`${tag}: archived list missing`));

    await page.getByRole('button', { name: 'Remove' }).first().click();
    await page.getByRole('button', { name: 'Remove' }).first().click();
    await page.waitForTimeout(500);
    if (!sent.some((item) => item.method === 'DELETE')) problems.push(`${tag}: delete not sent`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) problems.push(`${tag}: horizontal scroll`);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
