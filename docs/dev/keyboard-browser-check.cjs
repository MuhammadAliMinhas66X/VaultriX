// Sandbox-only. Serve the build (vite preview --port 4173), then: OUT=/tmp/x/ node docs/dev/keyboard-browser-check.cjs
// Dropdowns accept typing at once, Tab moves name -> amount in deductions, the Repeats field is on the expense form.
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const user = { id: 'u1', name: 'Test', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK' };
const day = new Date().toISOString().slice(0, 10);
const streams = [{ id: 's1', name: 'Main Income', expectedAmount: 100000, currency: 'PKR', incomeType: 'salaried', frequency: 'monthly', receivedAt: day, createdAt: day, destinationMethod: 'bank', destinationName: 'Meezan Bank', deductionsEnabled: true, deductions: [{ name: '', kind: 'fixed', value: '' }] }];
let posted = null;
const respond = (url, method, body) => {
  const path = new URL(url).pathname.replace(/^\/api/, '');
  if (path === '/auth/refresh') return { success: true, user, accessToken: 'token' };
  if (path === '/auth/me') return { success: true, user };
  if (path === '/fx/rates') return { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: new Date().toISOString() };
  if (path === '/expenses' && method === 'POST') { posted = JSON.parse(body); return { success: true, expense: { id: 'n', ...posted, amount: posted.amount, paidBy: 'self', repeat: posted.repeat } }; }
  if (path === '/expenses') return { success: true, expenses: [{ id: 'e1', amount: 500, currency: 'PKR', categoryId: null, spentAt: day, note: 'Gym', paidBy: 'self', repeat: 'monthly', repeatOf: null }] };
  if (path === '/income-streams') return { success: true, incomeStreams: streams };
  return { success: true, categories: [], loans: [], bills: [], receipts: [], totals: [], opening: null };
};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 900], ['phone', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    await page.route('http://localhost:5000/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respond(route.request().url(), route.request().method(), route.request().postData() || '{}')) }));

    // 1) Expenses: list shows the Repeats pill; the form has the field.
    await page.goto('http://localhost:4173/expenses', { waitUntil: 'domcontentloaded' });
    await page.getByText('Repeats', { exact: true }).first().waitFor({ timeout: 20000 });
    await page.getByRole('button', { name: 'Add expense' }).first().click();
    await page.locator('#expense-amount').waitFor();
    await page.locator('#expense-amount').fill('250');

    // 2) Open the currency list with the mouse and type straight away (no extra click).
    await page.getByRole('button', { name: 'Currency', exact: false }).first().click();
    await page.keyboard.type('eur');
    const typedBox = page.locator('input[placeholder*="earch"]').last();
    const value = await typedBox.inputValue();
    if (value !== 'eur') problems.push(`${tag}: typing right after opening gave "${value}"`);
    const options = await page.locator('[role="option"]').allInnerTexts();
    if (options.length === 0 || options.length > 4) problems.push(`${tag}: eur search gave ${options.length} options`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // 3) From the keyboard only: focus the Repeats list, type "m" is not searchable, use arrows.
    const repeat = page.getByRole('button', { name: 'Repeats', exact: true });
    await repeat.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    const shown = await repeat.innerText();
    if (!/Every week|Every month|Every day/.test(shown)) problems.push(`${tag}: repeat not chosen (${shown})`);
    await page.screenshot({ path: `${out}repeat-${tag}.png`, fullPage: false });
    await page.getByRole('button', { name: 'Save expense' }).click().catch(() => page.locator('button[type=submit]').last().click());
    await page.waitForTimeout(400);
    if (!posted || !posted.repeat || posted.repeat === 'none') problems.push(`${tag}: repeat not sent (${JSON.stringify(posted)})`);
    posted = null;

    // 4) Closed dropdown button: typing a letter opens the list with that letter.
    await page.getByRole('button', { name: 'Add expense' }).first().click();
    await page.locator('#expense-amount').waitFor();
    const cur = page.getByRole('button', { name: 'Currency', exact: false }).first();
    await cur.focus();
    await page.keyboard.type('u');
    await page.keyboard.type('s');
    const v2 = await page.locator('input[placeholder*="earch"]').last().inputValue();
    if (v2 !== 'us') problems.push(`${tag}: typing on closed button gave "${v2}"`);
    await page.keyboard.press('Escape');

    // 5) Deductions: Tab from the name goes to the amount.
    await page.goto('http://localhost:4173/income', { waitUntil: 'domcontentloaded' });
    const name = page.locator('input[aria-label="Deduction name"]').first();
    await page.getByText('Main Income').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(800);
    if (await name.count() === 0) {
      await page.getByText('Main Income').first().click().catch(() => {});
      await page.waitForTimeout(600);
      if (await name.count() === 0) await page.getByText('Monthly').first().click().catch(() => {});
    }
    await page.screenshot({ path: `${out}income-${tag}.png` }); await name.waitFor({ timeout: 8000 }).catch(() => problems.push(`${tag}: deduction row not found`));
    if (await name.count()) {
      await name.focus();
      await page.keyboard.type('Pension');
      await page.keyboard.press('Tab');
      const label = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'));
      if (label !== 'Deduction amount') problems.push(`${tag}: Tab from deduction name went to "${label}"`);
    }
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) problems.push(`${tag}: horizontal overflow ${over}px`);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
