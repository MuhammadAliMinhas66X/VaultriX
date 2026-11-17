// Sandbox-only. vite preview --port 4173, then: OUT=/tmp/x/ node docs/dev/salary-browser-check.cjs
// Salary planner: one ring, detach button, plan lines, logs, next month. Checks the saved payloads.
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const day = new Date().toISOString();
const month = day.slice(0, 7);
const user = { id: 'u1', name: 'Ali', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK', role: 'owner' };
const stream = { id: 's1', name: 'Job', incomeType: 'salaried', frequency: 'monthly', expectedAmount: 100000, currency: 'PKR', receivedAt: day, isArchived: false, deductions: [], taxEnabled: false, deductionsEnabled: false };
const cats = [{ id: 'c1', name: 'Food', type: 'expense' }, { id: 'c2', name: 'Transport', type: 'expense' }];
const expenses = [
  { id: 'e1', amount: 12000, currency: 'PKR', categoryId: 'c1', spentAt: day, paidBy: 'self', note: '' },
  { id: 'e2', amount: 3000, currency: 'PKR', categoryId: 'c2', spentAt: day, paidBy: 'self', note: '' },
];
const puts = [];
let plans = {};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 1000], ['phone', 390, 844]]) {
    puts.length = 0;
    plans = {};
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`${tag} console: ${m.text()}`); });
    await page.route('http://localhost:5000/api/**', (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname.replace(/^\/api/, '');
      let body = { success: true, categories: [], loans: [], bills: [], expenses: [], incomeStreams: [], totals: [], receipts: [], opening: null };
      if (path === '/auth/refresh' || path === '/auth/me') body = { success: true, user, accessToken: 't' };
      else if (path === '/fx/rates') body = { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: day };
      else if (path === '/income-streams') body = { success: true, incomeStreams: [stream] };
      else if (path === '/categories') body = { success: true, categories: cats };
      else if (path === '/expenses') body = { success: true, expenses, capped: false };
      else if (path === '/expenses/totals') body = { success: true, totals: [{ month, currency: 'PKR', self: 15000, other: 0, repaid: 0 }] };
      else if (path === '/salary-plan') {
        body = { success: true, plans: Object.values(plans).filter((p) => p.detached).map((p) => ({ ...p, planned: p.lines.reduce((s, l) => s + l.amount, 0) })) };
      } else if (path.startsWith('/salary-plan/')) {
        const key = path.split('/')[2];
        if (req.method() === 'PUT') {
          const sent = JSON.parse(req.postData() || '{}');
          puts.push({ key, ...sent });
          plans[key] = { month: key, streamId: 's1', detached: sent.detached, salary: sent.salary || 0, currency: sent.currency || null, lines: sent.lines.map((line, index) => ({ id: `n${index}`, ...line })) };
        }
        body = { success: true, plan: plans[key] || { month: key, streamId: null, detached: false, salary: 0, currency: null, lines: [] } };
      }
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto('http://localhost:4173/salary', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Detach from income stream' }).waitFor({ timeout: 20000 });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${out}salary-attached-${tag}.png`, fullPage: true });
    if (await page.locator('svg[role="img"]').count() < 1) problems.push(`${tag}: ring missing`);

    await page.getByRole('button', { name: 'Detach from income stream' }).click();
    await page.getByText('Total salary this month').waitFor();
    if (!puts.length || puts[0].detached !== true || puts[0].salary !== 100000 || puts[0].currency !== 'PKR') problems.push(`${tag}: detach payload wrong ${JSON.stringify(puts[0])}`);

    await page.getByText('Total salary this month').waitFor();
    await page.getByLabel('Total salary this month').fill('120000');
    await page.getByLabel('Total salary this month').blur();
    await page.waitForTimeout(600);
    if (puts[puts.length - 1].salary !== 120000) problems.push(`${tag}: salary edit payload wrong ${JSON.stringify(puts[puts.length - 1])}`);
    await page.getByLabel('Total salary this month').fill('100000');
    await page.getByLabel('Total salary this month').blur();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Food', exact: true }).click();
    if ((await page.getByPlaceholder('Rent, bills, savings...').inputValue()) !== 'Food') problems.push(`${tag}: chip did not fill the name`);
    await page.getByPlaceholder('Rent, bills, savings...').fill('Food');
    await page.getByPlaceholder('0').first().fill('20000');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.waitForTimeout(700);
    const added = puts[puts.length - 1];
    if (!added || added.lines.length !== 1 || added.lines[0].categoryId !== 'c1' || added.salary !== 100000) problems.push(`${tag}: add payload wrong ${JSON.stringify(added)}`);
    await page.getByText('12,000 spent of').first().waitFor().catch(() => problems.push(`${tag}: food progress missing`));

    await page.getByPlaceholder('Rent, bills, savings...').fill('Rent');
    await page.getByPlaceholder('0').first().fill('40000');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${out}salary-detached-${tag}.png`, fullPage: true });
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) problems.push(`${tag}: horizontal scroll`);
    await page.getByText('Salary history').waitFor();
    await page.mouse.move(Math.round(w / 2), Math.round(h / 2));
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(600);
    const heroTop = await page.evaluate(() => { const el = document.querySelector('section.sticky'); return el ? Math.round(el.getBoundingClientRect().top) : null; });
    if (heroTop === null || heroTop < 56 || heroTop > 130) problems.push(`${tag}: ring card must stick BELOW the 56px top bar while scrolling (top ${heroTop})`);
    await page.screenshot({ path: `${out}salary-scrolled-${tag}.png` });
    await page.mouse.wheel(0, -2000);
    await page.getByText('Planned saving').first().waitFor().catch(() => problems.push(`${tag}: log row missing`));

    await page.getByRole('button', { name: 'Remove' }).first().click();
    await page.waitForTimeout(600);
    if (puts[puts.length - 1].lines.length !== 1) problems.push(`${tag}: remove payload wrong`);

    await page.getByRole('button', { name: 'Plan next month' }).click();
    await page.getByRole('button', { name: 'Detach from income stream' }).waitFor().catch(() => problems.push(`${tag}: next month not attached`));

    await page.getByRole('button', { name: 'This month' }).click();
    await page.getByRole('button', { name: 'Attach back to income stream' }).click();
    await page.waitForTimeout(600);
    if (puts[puts.length - 1].detached !== false) problems.push(`${tag}: attach payload wrong`);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
