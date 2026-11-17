// Sandbox-only. cd frontend && npx vite build && npx vite preview --port 4173, then from repo root:
// OUT=/tmp/x/ node docs/dev/salary-browser-check.cjs
// Salary planner redesign: overview maths, add/edit/delete allocations, disconnect/reconnect, month nav, overflow.
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const day = new Date().toISOString();
const month = day.slice(0, 7);
const user = { id: 'u1', name: 'Ali', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK', role: 'owner' };
const stream = { id: 's1', name: 'Job', incomeType: 'salaried', frequency: 'monthly', expectedAmount: 58187, currency: 'PKR', receivedAt: day, isArchived: false, deductions: [], taxEnabled: false, deductionsEnabled: false };
const cats = [{ id: 'c1', name: 'Food', type: 'expense' }, { id: 'c2', name: 'Transport', type: 'expense' }];
const expenses = [{ id: 'e1', amount: 1200, currency: 'PKR', categoryId: 'c1', spentAt: day, paidBy: 'self', note: '' }];
const seed = () => ({
  [month]: { month, streamId: 's1', detached: false, salary: 0, currency: null, lines: [
    { id: 'l1', label: 'PTCL Home Internet', amount: 3160, categoryId: null, kind: 'spend' },
    { id: 'l2', label: 'Shama', amount: 5000, categoryId: null, kind: 'spend' },
    { id: 'l3', label: 'Savings', amount: 30000, categoryId: null, kind: 'savings' },
    { id: 'l4', label: 'Home', amount: 10000, categoryId: null, kind: 'spend' },
  ] },
});
let plans = seed();
const puts = [];
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  const text = async (page, sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ');
  for (const [tag, w, h] of [['desktop', 1280, 900], ['tablet', 768, 1000], ['phone', 390, 844]]) {
    puts.length = 0;
    plans = seed();
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
      else if (path === '/expenses/totals') body = { success: true, totals: [{ month, currency: 'PKR', self: 1200, other: 0, repaid: 0 }] };
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
    await page.getByRole('heading', { name: 'Salary Planner' }).waitFor({ timeout: 20000 });
    await page.getByText('PTCL Home Internet').waitFor();
    await page.waitForTimeout(500);

    // existing allocations + attached stream: never show the full salary as unallocated
    const overview = await text(page, 'section[aria-label="Salary Planner"]');
    if (!/10,027/.test(overview) || !/48,160/.test(overview) || !/30,000/.test(overview)) problems.push(`${tag}: overview maths wrong: ${overview}`);
    if (!/82\.77% allocated/.test(overview)) problems.push(`${tag}: percent wrong: ${overview}`);
    if (/Unallocated\s*Rs\s*58,187/.test(overview)) problems.push(`${tag}: full salary shown as unallocated`);
    await page.screenshot({ path: `${out}salary-${tag}-1-overview.png`, fullPage: true });

    // validation
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByText('Enter a name for this allocation.').waitFor().catch(() => problems.push(`${tag}: name error missing`));
    await page.getByText('Enter an amount above zero.').waitFor().catch(() => problems.push(`${tag}: amount error missing`));
    if (puts.length) problems.push(`${tag}: invalid form saved`);
    await page.screenshot({ path: `${out}salary-${tag}-2-errors.png`, fullPage: true });

    // add with category
    await page.getByPlaceholder('Rent, bills, savings...').fill('Groceries');
    await page.getByPlaceholder('0').first().fill('2000');
    await page.getByRole('button', { name: 'Category' }).click();
    await page.getByRole('option', { name: 'Food' }).click();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForTimeout(600);
    const added = puts[puts.length - 1];
    if (!added || added.lines.length !== 5 || added.lines[4].categoryId !== 'c1' || added.lines[2].kind !== 'savings' || added.detached !== false) problems.push(`${tag}: add payload wrong ${JSON.stringify(added)}`);
    if (!/8,027/.test(await text(page, 'section[aria-label="Salary Planner"]'))) problems.push(`${tag}: unallocated not updated after add`);

    // edit
    await page.getByRole('button', { name: 'Edit: Shama' }).click();
    await page.getByPlaceholder('0').first().fill('6000');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForTimeout(600);
    if (puts[puts.length - 1].lines[1].amount !== 6000) problems.push(`${tag}: edit payload wrong`);

    // delete needs confirmation
    const before = puts.length;
    await page.getByRole('button', { name: 'Delete: Home' }).click();
    await page.getByText('Delete this allocation?').waitFor();
    if (puts.length !== before) problems.push(`${tag}: deleted without confirmation`);
    await page.screenshot({ path: `${out}salary-${tag}-3-confirm.png`, fullPage: true });
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Delete: Home' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForTimeout(600);
    if (puts[puts.length - 1].lines.some((l) => l.label === 'Home')) problems.push(`${tag}: delete payload wrong`);

    // disconnect, edit salary, reconnect
    await page.getByRole('button', { name: 'Disconnect' }).click();
    await page.getByRole('button', { name: 'Reconnect' }).waitFor();
    const det = puts[puts.length - 1];
    if (det.detached !== true || det.salary !== 58187 || det.currency !== 'PKR') problems.push(`${tag}: disconnect payload wrong ${JSON.stringify(det)}`);
    await page.getByLabel('Total salary this month').fill('60000');
    await page.getByLabel('Total salary this month').blur();
    await page.waitForTimeout(600);
    if (puts[puts.length - 1].salary !== 60000) problems.push(`${tag}: salary edit payload wrong`);
    await page.getByText('Salary history').waitFor();
    await page.getByText('Savings', { exact: true }).first().waitFor();
    await page.screenshot({ path: `${out}salary-${tag}-4-detached.png`, fullPage: true });
    await page.getByRole('button', { name: 'Reconnect' }).click();
    await page.waitForTimeout(600);
    if (puts[puts.length - 1].detached !== false) problems.push(`${tag}: reconnect payload wrong`);

    // month navigation
    await page.getByRole('button', { name: 'Plan next month' }).click();
    await page.getByText('No allocations yet').waitFor().catch(() => problems.push(`${tag}: next month not empty`));
    await page.getByRole('button', { name: 'This month' }).click();
    await page.getByRole('button', { name: 'Previous month' }).click().catch(() => {});

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) problems.push(`${tag}: horizontal overflow`);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
