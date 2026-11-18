// Sandbox-only. vite preview --port 4173, then: OUT=/tmp/x/ node docs/dev/reports-browser-check.cjs
// Reports: overview, budgets (add), goals (create, add money). Phone and desktop, no horizontal scroll.
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const day = new Date().toISOString();
const month = day.slice(0, 7);
const user = { id: 'u1', name: 'Ali', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK', role: 'owner' };
const stream = { id: 's1', name: 'Job', incomeType: 'salaried', frequency: 'monthly', expectedAmount: 100000, currency: 'PKR', receivedAt: day, isArchived: false, deductions: [], taxEnabled: false, deductionsEnabled: false };
const cats = [{ id: 'c1', name: 'Food', type: 'expense' }, { id: 'c2', name: 'Transport', type: 'expense' }];
const expenses = [
  { id: 'e1', amount: 12000, currency: 'PKR', categoryId: 'c1', spentAt: day, paidBy: 'self', note: 'Groceries' },
  { id: 'e2', amount: 3000, currency: 'PKR', categoryId: 'c2', spentAt: day, paidBy: 'self', note: '' },
];
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 1000], ['phone', 390, 844]]) {
    let budgets = [];
    let goals = [];
    const sent = [];
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) problems.push(`${tag} console: ${m.text()}`); });
    await page.route('http://localhost:5000/api/**', (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname.replace(/^\/api/, '');
      const post = req.postData() ? JSON.parse(req.postData()) : {};
      let body = { success: true, categories: [], loans: [], bills: [], expenses: [], incomeStreams: [], totals: [], receipts: [], opening: null, plans: [] };
      if (path === '/auth/refresh' || path === '/auth/me') body = { success: true, user, accessToken: 't' };
      else if (path === '/fx/rates') body = { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: day };
      else if (path === '/income-streams') body = { success: true, incomeStreams: [stream] };
      else if (path === '/categories') body = { success: true, categories: cats };
      else if (path === '/expenses') body = { success: true, expenses, capped: false };
      else if (path === '/expenses/totals') body = { success: true, totals: [{ month, currency: 'PKR', self: 15000, other: 0, repaid: 0 }] };
      else if (path === '/receipts') body = { success: true, receipts: [{ id: 'r1', streamId: 's1', receivedAt: day, amount: 100000, currency: 'PKR', note: '' }], capped: false };
      else if (path === '/receipts/opening') body = { success: true, opening: null };
      else if (path === '/budgets') {
        if (req.method() === 'PUT') { sent.push(post); budgets = [{ id: 'b1', categoryId: post.categoryId, amount: post.amount, currency: post.currency }]; }
        body = { success: true, budgets };
      } else if (path === '/goals' && req.method() === 'POST') {
        sent.push(post);
        goals = [{ id: 'g1', name: post.name, target: post.target, currency: post.currency, deadline: post.deadline, saved: 0, contributions: [] }];
        body = { success: true, goal: goals[0] };
      } else if (path === '/goals/g1/contributions') {
        sent.push(post);
        goals[0].saved += post.amount;
        goals[0].contributions = [{ id: 'k1', amount: post.amount, date: day.slice(0, 10), note: post.note }];
        body = { success: true, goal: goals[0] };
      } else if (path === '/goals') body = { success: true, goals };
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto('http://localhost:4173/reports', { waitUntil: 'domcontentloaded' });
    await page.getByText('Spending by category').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}reports-overview-${tag}.png`, fullPage: true });
    if (!(await page.getByText('Groceries').count())) problems.push(`${tag}: top expense missing`);
    if (!(await page.getByText('85%').count())) problems.push(`${tag}: savings rate missing`);

    await page.getByRole('tab', { name: 'Budgets' }).click();
    await page.getByRole('button', { name: 'Add budget' }).click();
    await page.getByRole('button', { name: 'Category' }).click();
    await page.getByRole('option', { name: 'Food' }).click();
    await page.getByLabel('Monthly limit').fill('14000');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByText('Only').first().waitFor({ timeout: 8000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}reports-budgets-${tag}.png`, fullPage: true });
    if (!sent.length || sent[0].amount !== 14000 || sent[0].categoryId !== 'c1') problems.push(`${tag}: budget payload ${JSON.stringify(sent[0])}`);

    await page.getByRole('tab', { name: 'Goals' }).click();
    await page.getByRole('button', { name: 'Add goal' }).first().click();
    await page.getByLabel('Goal name').fill('Laptop');
    await page.getByLabel('Target amount').fill('150000');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByText('Laptop').first().waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: 'Add money' }).click();
    await page.getByLabel('Add money').last().fill('30000');
    await page.getByRole('button', { name: 'Add money' }).last().click();
    await page.getByText('20%').waitFor({ timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${out}reports-goals-${tag}.png`, fullPage: true });
    if (!sent.some((p) => p.direction === 'in' && p.amount === 30000)) problems.push(`${tag}: contribution payload`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) problems.push(`${tag}: horizontal scroll`);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'reports check OK');
  process.exit(problems.length ? 1 : 0);
})();
