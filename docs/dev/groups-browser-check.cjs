// Sandbox-only. Serve the build (vite preview --port 4173), then: OUT=/tmp/x/ node docs/dev/groups-browser-check.cjs
// Groups: list with my balance, group page (balance, who pays whom, costs), add a shared cost, settle up.
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const user = { id: 'u1', name: 'Ali', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK' };
const day = new Date().toISOString();
const members = [{ id: 'u1', name: 'Ali', email: 'm@example.com', left: false, isCreator: true }, { id: 'u2', name: 'Sara', email: 's@example.com', left: false, isCreator: false }];
const group = { success: true, group: { id: 'g1', name: 'Flat 4B', currency: 'PKR', isCreator: true, limit: 12 }, me: 'u1', members,
  expenses: [{ id: 'e1', description: 'Rent', amount: 30000, currency: 'PKR', spentAt: day, paidBy: 'u1', splitType: 'equal', shares: [{ userId: 'u1', amount: 15000 }, { userId: 'u2', amount: 15000 }], createdBy: 'u1', inMyExpenses: false }],
  settlements: [], invites: [], balances: [{ currency: 'PKR', balances: [{ userId: 'u1', amount: 15000 }, { userId: 'u2', amount: -15000 }], transfers: [{ fromUserId: 'u2', toUserId: 'u1', amount: 15000 }] }], capped: false };
const calls = [];
const respond = (url, method, body) => {
  const path = new URL(url).pathname.replace(/^\/api/, '');
  if (path === '/auth/refresh') return { success: true, user, accessToken: 'token' };
  if (path === '/auth/me') return { success: true, user };
  if (path === '/fx/rates') return { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: day };
  if (path === '/groups' && method === 'GET') return { success: true, groups: [{ id: 'g1', name: 'Flat 4B', currency: 'PKR', members: 2, mine: [{ currency: 'PKR', amount: 15000 }] }] };
  if (path === '/groups/g1' && method === 'GET') return group;
  if (path === '/groups/g1/expenses' && method === 'POST') { calls.push(`expense:${body}`); return { success: true, expense: {} }; }
  if (path === '/groups/g1/settlements' && method === 'POST') { calls.push(`settle:${body}`); return { success: true, settlement: {} }; }
  return { success: true, categories: [], loans: [], bills: [], expenses: [], incomeStreams: [], totals: [], receipts: [], opening: null };
};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 900], ['phone', 390, 844]]) {
    calls.length = 0;
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    await page.route('http://localhost:5000/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respond(route.request().url(), route.request().method(), route.request().postData() || '{}')) }));
    await page.goto('http://localhost:4173/groups', { waitUntil: 'domcontentloaded' });
    await page.getByText('Flat 4B').first().waitFor({ timeout: 20000 });
    await page.getByText('You are owed').first().waitFor();
    await page.screenshot({ path: `${out}groups-list-${tag}.png` });
    await page.getByText('Flat 4B').first().click();
    await page.getByText('Who pays whom').waitFor();
    await page.getByText('Rent').first().waitFor();
    await page.screenshot({ path: `${out}group-${tag}.png`, fullPage: true });

    await page.getByRole('button', { name: 'Add shared cost' }).first().click();
    await page.getByPlaceholder('Rent, groceries, electricity...').fill('Groceries');
    await page.getByPlaceholder('0').first().fill('1001');
    await page.getByRole('button', { name: 'Repeats' }).click();
    await page.getByRole('option', { name: 'Every month' }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}group-add-${tag}.png` });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForTimeout(500);
    const sent = calls.find((c) => c.startsWith('expense:'));
    if (!sent) problems.push(`${tag}: expense not sent`);
    else {
      const body = JSON.parse(sent.slice(8));
      if (body.description !== 'Groceries' || body.amount !== 1001 || body.splitType !== 'equal' || body.repeat !== 'monthly' || body.participants.length !== 2 || body.paidBy !== 'u1') problems.push(`${tag}: bad payload ${sent}`);
    }

    calls.length = 0;
    await page.getByRole('button', { name: 'Add shared cost' }).first().click();
    await page.getByPlaceholder('Rent, groceries, electricity...').fill('Trip');
    await page.getByPlaceholder('0').first().fill('1000');
    await page.getByRole('radio', { name: 'Percent' }).click();
    await page.getByLabel('Ali').last().fill('60');
    await page.getByLabel('Sara').last().fill('30');
    await page.getByText('10% left to assign').waitFor();
    await page.getByLabel('Sara').last().fill('40');
    await page.getByText('All assigned').waitFor();
    await page.screenshot({ path: `${out}group-percent-${tag}.png` });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForTimeout(500);
    const pc = calls.find((c) => c.startsWith('expense:'));
    if (!pc || JSON.parse(pc.slice(8)).splitType !== 'percent' || JSON.parse(pc.slice(8)).percents.length !== 2) problems.push(`${tag}: percent payload wrong ${pc}`);

    await page.getByRole('button', { name: 'Settle up' }).first().click();
    await page.getByText('Record a payment').first().waitFor();
    await page.getByRole('button', { name: 'Save payment' }).click();
    await page.waitForTimeout(500);
    const pay = calls.find((c) => c.startsWith('settle:'));
    if (!pay) problems.push(`${tag}: settle not sent`);
    else {
      const body = JSON.parse(pay.slice(7));
      if (body.fromUserId !== 'u2' || body.toUserId !== 'u1' || body.amount !== 15000) problems.push(`${tag}: bad settle ${pay}`);
    }
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) problems.push(`${tag}: horizontal overflow ${over}px`);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
