// Sandbox-only. vite preview --port 4173, then: OUT=/tmp/x/ node docs/dev/menu-committee-browser-check.cjs
// Menu toggles in Settings (celebration), sidebar and phone "More", Savings page, committee page with dice.
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const day = new Date().toISOString();
const month = day.slice(0, 7);
const user = { id: 'u1', name: 'Ali', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK', role: 'owner' };
const stream = { id: 's1', name: 'Job', incomeType: 'salaried', frequency: 'monthly', expectedAmount: 100000, currency: 'PKR', receivedAt: day, isArchived: false, deductions: [], taxEnabled: false, deductionsEnabled: false };
const addDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const rounds = Array.from({ length: 4 }, (_, i) => ({ round: i + 1, due: addDays(i - 1), status: i === 0 ? 'overdue' : 'upcoming', paidAt: null, mine: i === 0, winner: i === 0 ? { type: 'me', id: null, name: null } : null, collected: i === 0 ? 2 : 0, collectedAmount: 0, complete: false, paidOutAt: null }));
const committee = {
  id: 'c1', name: 'Office Kameti', role: 'organizer', currency: 'PKR', contribution: 5000, size: 4, frequency: 'monthly', startDate: addDays(-1), mySlot: 1,
  rounds, members: [
    { id: 'm1', name: 'Sana', slot: null, linked: true, email: 's@x.com', paidRounds: [1], lateRounds: [], paid: 5000 },
    { id: 'm2', name: 'Bilal', slot: null, linked: false, email: '', paidRounds: [], lateRounds: [1], paid: 0 },
    { id: 'm3', name: 'Ahmed', slot: null, linked: false, email: '', paidRounds: [], lateRounds: [1], paid: 0 },
  ],
  paidCount: 0, paid: 0, total: 20000, next: rounds[0], overdueCount: 1, payout: 20000, payoutDay: rounds[0].due, payoutStatus: 'ready', payoutReceivedAt: null,
  endDay: addDays(90), owed: 10000, lateMembers: 2, potsToHandOver: 0, missingNames: 0, finished: false, pot: 20000, collectedTotal: 10000, expectedTotal: 20000, dueRounds: 1,
};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 1000], ['phone', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) problems.push(`${tag} console: ${m.text()}`); });
    const calls = [];
    await page.route('http://localhost:5000/api/**', (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname.replace(/^\/api/, '');
      if (req.method() !== 'GET') calls.push(`${req.method()} ${path} ${req.postData() || ''}`);
      let body = { success: true, categories: [], loans: [], bills: [], expenses: [], incomeStreams: [], totals: [], receipts: [], opening: null, plans: [], budgets: [], goals: [], entries: [], accounts: [], committees: [] };
      if (path === '/auth/refresh' || path === '/auth/me') body = { success: true, user, accessToken: 't' };
      else if (path === '/fx/rates') body = { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: day };
      else if (path === '/income-streams') body = { success: true, incomeStreams: [stream] };
      else if (path === '/receipts') body = { success: true, receipts: [{ id: 'r1', streamId: 's1', receivedAt: day, amount: 100000, currency: 'PKR', note: '' }, { id: 'r0', streamId: 's1', receivedAt: `${new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 7)}-05`, amount: 100000, currency: 'PKR', note: '' }], capped: false };
      else if (path === '/expenses/totals') body = { success: true, totals: [{ month, currency: 'PKR', self: 30000, other: 0, repaid: 0 }] };
      else if (path === '/committees') body = { success: true, committees: [committee] };
      else if (path.startsWith('/committees/') && req.method() !== 'GET') body = { success: true, committee };
      else if (path === '/savings' && req.method() === 'POST') body = { success: true, entry: { id: 'e1', amount: 2500, currency: 'PKR', date: day.slice(0, 10), note: '' } };
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    // Savings page
    await page.goto('http://localhost:4173/goals', { waitUntil: 'domcontentloaded' });
    await page.getByText('Total saved').waitFor({ timeout: 20000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}savings-${tag}.png`, fullPage: true });
    if (!(await page.getByText('Left over each month').count())) problems.push(`${tag}: months list missing`);
    await page.getByRole('button', { name: 'Add savings' }).click();
    await page.getByLabel('Add savings').last().fill('2500');
    await page.getByRole('button', { name: 'Add savings' }).last().click();
    await page.waitForTimeout(400);
    if (!calls.some((c) => c.startsWith('POST /savings') && c.includes('2500') && c.includes('"in"'))) problems.push(`${tag}: savings payload ${calls.join('|')}`);

    // Committee page
    await page.goto('http://localhost:4173/committees/c1', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Office Kameti' }).waitFor({ timeout: 20000 });
    await page.getByRole('button', { name: /Hold to shake/ }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}committee-${tag}.png`, fullPage: true });
    const cup = page.getByRole('button', { name: /Hold to shake/ });
    await cup.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const box = await cup.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}committee-hold-${tag}.png` });
    await page.mouse.up();
    await page.getByRole('button', { name: 'Save this turn' }).waitFor({ timeout: 6000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}committee-result-${tag}.png` });
    await page.getByRole('button', { name: 'Save this turn' }).click();
    await page.waitForTimeout(400);
    if (!calls.some((c) => c.startsWith('PUT /committees/c1/rounds/2/winner'))) problems.push(`${tag}: winner call missing ${calls.join('|')}`);

    // Settings menu
    await page.goto('http://localhost:4173/settings', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ timeout: 20000 }); await page.waitForTimeout(600);
    if (w < 800) { await page.locator('button[aria-label="Menu"]:visible').first().click(); }
    else await page.getByRole('button', { name: 'Menu', exact: true }).first().click();
    await page.getByRole('switch', { name: 'Groups' }).waitFor({ timeout: 8000 });
    await page.screenshot({ path: `${out}menu-${tag}.png`, fullPage: true });
    await page.getByRole('switch', { name: 'Groups' }).click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}celebration-${tag}.png` });
    await page.waitForTimeout(2400);
    if ((await page.getByRole('switch', { name: 'Groups' }).getAttribute('aria-checked')) !== 'true') problems.push(`${tag}: groups switch not on`);
    await page.getByRole('switch', { name: 'Budgets' }).click();
    await page.waitForTimeout(300);
    await page.goto('http://localhost:4173/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}nav-${tag}.png` });
    if (w >= 800 && (await page.getByRole('link', { name: 'Budgets', exact: true }).count())) problems.push(`${tag}: Budgets link still shown after switching off`);
    if (w >= 800 && !(await page.getByRole('link', { name: 'Committees' }).count())) problems.push(`${tag}: Committees link missing`);
    if (w < 800) {
      await page.getByRole('button', { name: 'More' }).click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}more-${tag}.png` });
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) problems.push(`${tag}: horizontal scroll on dashboard`);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'menu/committee check OK');
  process.exit(problems.length ? 1 : 0);
})();
