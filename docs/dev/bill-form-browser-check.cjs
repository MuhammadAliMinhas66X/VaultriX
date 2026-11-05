// Sandbox-only: drives the add-bill form (company, category, new category, due, repeat, note, Save and add another, autofill).
// Same setup as bills-browser-check.cjs.
const { chromium } = require('playwright');
const out = (process.env.OUT || ".") + "/";
const day = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00.000Z`; };
const user = { id: 'u1', name: 'Ali', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK' };
const stream = { id: 's1', name: 'Main', expectedAmount: 62000, currency: 'PKR', incomeType: 'salaried', frequency: 'monthly', receivedAt: day(-5), createdAt: day(-30), destinationMethod: 'cash', destinationName: '', deductFromTotal: false, deductions: [] };
let cats = [{ id: 'c1', name: 'Utilities', type: 'expense', icon: 'bills' }, { id: 'c2', name: 'Internet', type: 'expense', icon: 'internet' }];
let bills = [];
let seq = 0;
const respond = (url, method, body) => {
  const path = new URL(url).pathname.replace(/^\/api/, '');
  if (path === '/auth/refresh') return { success: true, user, accessToken: 't' };
  if (path === '/fx/rates') return { success: true, base: 'PKR', rates: { PKR: 1, USD: 0.0036 }, live: [], liveAt: new Date().toISOString() };
  if (path === '/income-streams') return { success: true, incomeStreams: [stream] };
  if (path === '/categories' && method === 'POST') { const c = { id: 'c' + (cats.length + 1), type: 'expense', ...body }; cats.push(c); return { success: true, category: c }; }
  if (path === '/categories') return { success: true, categories: cats };
  if (path === '/bills' && method === 'POST') {
    const b = { id: 'b' + (++seq), ...body, installation: body.installation || 0, total: body.amount + (body.installation || 0), paid: 0, remaining: body.amount, dueAt: body.dueAt + 'T00:00:00.000Z', periodStart: null, periodEnd: null, nextBillAt: null, seriesState: 'active', isHead: body.frequency !== 'none', seriesId: 'b' + seq, sequence: 1, cancelledAt: null, createdAt: new Date().toISOString(), payments: [], frequency: body.frequency || 'none' };
    bills.push(b); return { success: true, bill: b };
  }
  if (path === '/bills') return { success: true, bills };
  return { success: true, expenses: [], loans: [] };
};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [name, w, h] of [['phone', 390, 844], ['desktop', 1280, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${name} pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource|ERR_/.test(m.text())) problems.push(`${name} console: ${m.text()}`); });
    await page.route('http://localhost:5000/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respond(route.request().url(), route.request().method(), route.request().postDataJSON?.() || {})) }));
    bills = []; seq = 0;
    await page.goto('http://localhost:4173/bills', { waitUntil: 'domcontentloaded' });
    // empty state then open form
    await page.waitForSelector('text=Add bill', { timeout: 20000 });
    const addBtn = page.getByRole('button', { name: /Add bill/ }).first();
    await addBtn.click();
    await page.waitForSelector('text=Bill amount');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}form-${name}-1.png` });
    // pick biller
    await page.locator('button[aria-label="Company"]').click();
    await page.fill('input[placeholder="Search"]', 'k-el').catch(() => {});
    await page.getByRole('option', { name: /K-Electric/ }).click();
    await page.fill('#bill-amount', '18450');
    // category dropdown
    await page.locator('div[role=dialog] button[aria-label="Category"], [role=dialog] button[aria-label="Category"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}form-${name}-cat.png` });
    await page.getByText('New category', { exact: false }).last().click();
    await page.waitForSelector('[aria-label="New category"]');
    await page.fill('[aria-label="New category"] input', 'Electricity');
    await page.screenshot({ path: `${out}form-${name}-newcat.png` });
    await page.getByRole('button', { name: 'Create category' }).click();
    await page.waitForSelector('[aria-label="New category"]', { state: 'detached' });
    // quick due + repeat
    await page.getByRole('button', { name: 'In 15 days' }).click();
    await page.locator('button[aria-label="Repeats"]').click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}form-${name}-repeat.png` });
    await page.getByRole('option', { name: /Monthly/ }).click();
    await page.getByRole('button', { name: /More options/ }).click();
    await page.fill('textarea', 'Meter reading 4521');
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}form-${name}-2.png`, fullPage: false });
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (ov > 0) problems.push(`${name} overflow ${ov}`);
    await page.getByRole('button', { name: 'Save & add another' }).click();
    await page.waitForFunction(() => document.querySelector('#bill-amount') && document.querySelector('#bill-amount').value === '');
    // remembered: re-pick same biller, check autofill
    await page.locator('button[aria-label="Company"]').click();
    await page.getByRole('option', { name: /K-Electric/ }).click();
    const amount = await page.inputValue('#bill-amount');
    if (amount !== '18450') problems.push(`${name} autofill amount was "${amount}"`);
    const catText = await page.locator('div[role=dialog] button[aria-label="Category"], [role=dialog] button[aria-label="Category"]').innerText();
    if (!/Electricity/.test(catText)) problems.push(`${name} autofill category was "${catText}"`);
    await page.screenshot({ path: `${out}form-${name}-3.png` });
    await ctx.close();
  }
  console.log(problems.length ? problems.join('\n') : 'no problems');
  await browser.close();
})().catch((e) => { console.log('FAIL', e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
