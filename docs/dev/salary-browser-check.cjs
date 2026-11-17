// Sandbox-only. vite preview --port 4173, then: OUT=/tmp/x/ node docs/dev/salary-browser-check.cjs
// Salary planner: ring, tiles, plan vs real spending, add / remove a line (checks the saved payload).
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const day = new Date().toISOString();
const month = day.slice(0, 7);
const user = { id: 'u1', name: 'Ali', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK', role: 'owner' };
const stream = { id: 's1', name: 'Job', incomeType: 'salaried', frequency: 'monthly', expectedAmount: 100000, currency: 'PKR', receivedAt: day, isArchived: false, deductions: [], taxEnabled: false, deductionsEnabled: false };
const cats = [{ id: 'c1', name: 'Food', type: 'expense' }, { id: 'c2', name: 'Transport', type: 'expense' }];
let plan = [{ id: 'l1', label: 'Rent', amount: 40000, categoryId: null }, { id: 'l2', label: 'Food', amount: 20000, categoryId: 'c1' }];
const expenses = [
  { id: 'e1', amount: 12000, currency: 'PKR', categoryId: 'c1', spentAt: day, paidBy: 'self', note: '' },
  { id: 'e2', amount: 3000, currency: 'PKR', categoryId: 'c2', spentAt: day, paidBy: 'self', note: '' },
];
const puts = [];
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 1000], ['phone', 390, 844]]) {
    puts.length = 0;
    plan = [{ id: 'l1', label: 'Rent', amount: 40000, categoryId: null }, { id: 'l2', label: 'Food', amount: 20000, categoryId: 'c1' }];
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    await page.route('http://localhost:5000/api/**', (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname.replace(/^\/api/, '');
      let body = { success: true, categories: [], loans: [], bills: [], expenses: [], incomeStreams: [], totals: [], receipts: [], opening: null };
      if (path === '/auth/refresh' || path === '/auth/me') body = { success: true, user, accessToken: 't' };
      else if (path === '/fx/rates') body = { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: day };
      else if (path === '/income-streams') body = { success: true, incomeStreams: [stream] };
      else if (path === '/categories') body = { success: true, categories: cats };
      else if (path === '/expenses') body = { success: true, expenses, capped: false };
      else if (path.startsWith('/salary-plan/')) {
        if (req.method() === 'PUT') {
          const sent = JSON.parse(req.postData() || '{}');
          puts.push(sent);
          plan = sent.lines.map((line, index) => ({ id: `n${index}`, ...line }));
        }
        body = { success: true, plan: { month, streamId: 's1', lines: plan } };
      }
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto('http://localhost:4173/salary', { waitUntil: 'domcontentloaded' });
    await page.getByText('Where it goes').waitFor({ timeout: 20000 });
    await page.getByText('12,000 spent of').first().waitFor().catch(() => problems.push(`${tag}: food progress missing`));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}salary-${tag}.png`, fullPage: true });
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) problems.push(`${tag}: horizontal scroll`);

    await page.getByPlaceholder('Rent, food, savings...').fill('Savings');
    await page.getByPlaceholder('0').first().fill('10000');
    await page.getByRole('button', { name: 'Add to plan' }).click();
    await page.waitForTimeout(600);
    if (!puts.length || puts[0].lines.length !== 3 || puts[0].lines[2].label !== 'Savings' || puts[0].lines[2].amount !== 10000) problems.push(`${tag}: add payload wrong ${JSON.stringify(puts[0])}`);
    await page.getByRole('button', { name: 'Remove' }).first().click();
    await page.waitForTimeout(600);
    if (puts.length < 2 || puts[1].lines.length !== 2) problems.push(`${tag}: remove payload wrong`);
    await page.screenshot({ path: `${out}salary-after-${tag}.png`, fullPage: true });
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
